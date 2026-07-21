import "server-only";
import { getIntegrationConfig } from "@/lib/settings";

// SMS via Twilio REST API. Reads credentials from the Control Center settings
// (DB) with env-var fallback. Degrades to a console log when unconfigured.

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function isSmsConfigured(): Promise<boolean> {
  const { sms } = await getIntegrationConfig();
  return Boolean(sms.twilioSid && sms.twilioToken && sms.twilioFrom);
}

export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<SendResult> {
  const { sms } = await getIntegrationConfig();
  if (!sms.twilioSid || !sms.twilioToken || !sms.twilioFrom) {
    console.log(`[sms skipped — not configured] to=${to} body="${body}"`);
    return { ok: false, skipped: true };
  }

  const { twilioSid: sid, twilioToken: token, twilioFrom: from } = sms;

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
