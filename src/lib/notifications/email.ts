import "server-only";
import { getIntegrationConfig } from "@/lib/settings";

// Email via Resend REST API. Reads credentials from the Control Center settings
// (DB) with env-var fallback, so admins can configure it from the portal.
// Degrades to a console log when unconfigured.

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function isEmailConfigured(): Promise<boolean> {
  const { email } = await getIntegrationConfig();
  return Boolean(email.resendApiKey && email.fromEmail);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const { email } = await getIntegrationConfig();
  if (!email.resendApiKey || !email.fromEmail) {
    console.log(`[email skipped — not configured] to=${to} subject="${subject}"`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${email.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: email.fromEmail, to, subject, html }),
    });
    if (!res.ok) {
      const error = await res.text();
      console.error(`[email failed] ${res.status} ${error}`);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email error]", err);
    return { ok: false, error: (err as Error).message };
  }
}
