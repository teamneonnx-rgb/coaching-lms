import "server-only";

// Email via Resend REST API. Degrades to a console log when unconfigured so
// attendance flows work end-to-end without credentials.

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!isEmailConfigured()) {
    console.log(`[email skipped — not configured] to=${to} subject="${subject}"`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
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
