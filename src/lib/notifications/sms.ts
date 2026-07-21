import "server-only";

// SMS via Twilio REST API (spec allows Twilio/MSG91). Degrades to a console log
// when unconfigured so attendance flows work end-to-end without credentials.

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<SendResult> {
  if (!isSmsConfigured()) {
    console.log(`[sms skipped — not configured] to=${to} body="${body}"`);
    return { ok: false, skipped: true };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      }
    );
    if (!res.ok) {
      const error = await res.text();
      console.error(`[sms failed] ${res.status} ${error}`);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    console.error("[sms error]", err);
    return { ok: false, error: (err as Error).message };
  }
}
