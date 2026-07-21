import "server-only";
import { db } from "@/lib/db";

// Single-tenant-for-now default institute (multi-tenant reads pass an explicit id).
export const DEFAULT_INSTITUTE_ID = "inst-default";

export type IntegrationConfig = {
  razorpay: { keyId: string; keySecret: string; mode: string; enabled: boolean };
  whatsapp: {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
    enabled: boolean;
  };
  email: { resendApiKey: string; fromEmail: string };
  sms: { twilioSid: string; twilioToken: string; twilioFrom: string };
};

async function settingsMap(instituteId: string): Promise<Record<string, string>> {
  const rows = await db.setting.findMany({
    where: { instituteId },
    select: { key: true, value: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// Effective config: DB setting wins, else env var, else "". Server-only.
export async function getIntegrationConfig(
  instituteId: string = DEFAULT_INSTITUTE_ID
): Promise<IntegrationConfig> {
  const s = await settingsMap(instituteId);
  const g = (k: string, env?: string) => s[k] ?? (env ? process.env[env] ?? "" : "");
  return {
    razorpay: {
      keyId: g("razorpay.keyId"),
      keySecret: g("razorpay.keySecret"),
      mode: s["razorpay.mode"] ?? "test",
      enabled: s["razorpay.enabled"] === "true",
    },
    whatsapp: {
      phoneNumberId: g("whatsapp.phoneNumberId"),
      businessAccountId: g("whatsapp.businessAccountId"),
      accessToken: g("whatsapp.accessToken"),
      enabled: s["whatsapp.enabled"] === "true",
    },
    email: {
      resendApiKey: g("email.resendApiKey", "RESEND_API_KEY"),
      fromEmail: g("email.fromEmail", "EMAIL_FROM"),
    },
    sms: {
      twilioSid: g("sms.twilioSid", "TWILIO_ACCOUNT_SID"),
      twilioToken: g("sms.twilioToken", "TWILIO_AUTH_TOKEN"),
      twilioFrom: g("sms.twilioFrom", "TWILIO_FROM_NUMBER"),
    },
  };
}

// Safe for the client: identifiers/toggles are returned for prefill; the 4
// secrets are returned only as a "set" boolean, never their value.
export async function getIntegrationStatus(instituteId: string = DEFAULT_INSTITUTE_ID) {
  const c = await getIntegrationConfig(instituteId);
  return {
    razorpay: {
      configured: !!(c.razorpay.keyId && c.razorpay.keySecret),
      enabled: c.razorpay.enabled,
      mode: c.razorpay.mode,
      keyId: c.razorpay.keyId,
      keySecretSet: !!c.razorpay.keySecret,
    },
    whatsapp: {
      configured: !!(c.whatsapp.phoneNumberId && c.whatsapp.accessToken),
      enabled: c.whatsapp.enabled,
      phoneNumberId: c.whatsapp.phoneNumberId,
      businessAccountId: c.whatsapp.businessAccountId,
      accessTokenSet: !!c.whatsapp.accessToken,
    },
    email: {
      configured: !!(c.email.resendApiKey && c.email.fromEmail),
      resendApiKeySet: !!c.email.resendApiKey,
      fromEmail: c.email.fromEmail,
    },
    sms: {
      configured: !!(c.sms.twilioSid && c.sms.twilioToken && c.sms.twilioFrom),
      twilioSid: c.sms.twilioSid,
      twilioTokenSet: !!c.sms.twilioToken,
      twilioFrom: c.sms.twilioFrom,
    },
  };
}

export type IntegrationStatus = Awaited<ReturnType<typeof getIntegrationStatus>>;
