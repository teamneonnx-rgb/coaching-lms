"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { startOnlinePayment, verifyOnlinePayment } from "@/lib/actions/payments";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

// Loads checkout.js on demand, opens Razorpay checkout for the fee's
// outstanding amount (derived server-side), then verifies the signature
// server-side before anything is marked paid.
export function RazorpayPayButton({ paymentId, label }: { paymentId: string; label: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [opening, setOpening] = useState(false);

  async function ensureScript(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  function pay() {
    setOpening(true);
    start(async () => {
      try {
        const order = await startOnlinePayment(paymentId);
        if (!order.ok || !order.orderId || !order.keyId) {
          toast.error(order.error ?? "Could not start payment");
          return;
        }
        if (!(await ensureScript()) || !window.Razorpay) {
          toast.error("Could not load the payment gateway");
          return;
        }
        const rzp = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amountPaise,
          currency: "INR",
          name: "Coaching LMS",
          description: label,
          handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            void (async () => {
              const r = await verifyOnlinePayment({
                paymentId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              if (r.ok) toast.success(r.info ?? "Payment successful");
              else toast.error(r.error ?? "Verification failed");
              router.refresh();
            })();
          },
        });
        rzp.open();
      } finally {
        setOpening(false);
      }
    });
  }

  return (
    <Button size="sm" onClick={pay} disabled={isPending || opening} className="bg-orange-500 text-white hover:bg-orange-500/90">
      {isPending || opening ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
      Pay online
    </Button>
  );
}
