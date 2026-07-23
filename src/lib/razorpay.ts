import "server-only";
import crypto from "crypto";
import { getIntegrationConfig } from "@/lib/settings";

// Razorpay online collection (user decision: offline AND online). Credentials
// come from the Control Center (Setting table) — nothing hardcoded. Until the
// admin saves keys + enables the gateway, every entry point degrades to a
// clear "not configured" error.

export async function getRazorpayConfig() {
  const cfg = await getIntegrationConfig();
  const { keyId, keySecret, enabled } = cfg.razorpay;
  if (!enabled || !keyId || !keySecret) return null;
  return { keyId, keySecret };
}

// Create an order via the REST API (basic auth). Amount in paise.
export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ ok: true; orderId: string; keyId: string } | { ok: false; error: string }> {
  const cfg = await getRazorpayConfig();
  if (!cfg) return { ok: false, error: "Online payments aren't configured yet — ask your admin to enable Razorpay in the Control Center" };

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: Math.round(input.amountPaise),
        currency: "INR",
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[razorpay] order create failed", res.status, body.slice(0, 300));
      return { ok: false, error: "Payment gateway rejected the order — check the Razorpay keys" };
    }
    const order = (await res.json()) as { id: string };
    return { ok: true, orderId: order.id, keyId: cfg.keyId };
  } catch (err) {
    console.error("[razorpay] order create error", err);
    return { ok: false, error: "Could not reach the payment gateway" };
  }
}

// Official checkout verification: HMAC-SHA256(order_id + "|" + payment_id)
// with the key secret must equal the signature Razorpay returned.
export async function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<boolean> {
  const cfg = await getRazorpayConfig();
  if (!cfg) return false;
  const expected = crypto
    .createHmac("sha256", cfg.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
}
