"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notifications/email";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const BCRYPT_ROUNDS = 12;
const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

// FR-AU-03: user requests a reset by email. We always report success (never
// leak whether an email exists). When the account exists, a one-time token
// (valid 1 hour) is emailed as a reset link — logged if email isn't configured.
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const clean = email.trim().toLowerCase();
  const generic = { ok: true, info: "If that account exists, a reset link has been sent." };
  if (!clean) return { ok: false, error: "Enter your email" };

  const user = await db.user.findFirst({
    where: { email: clean, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!user) return generic;

  const token = crypto.randomBytes(32).toString("hex");
  await db.user.update({
    where: { id: user.id },
    data: { resetTokenHash: sha256(token), resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const base = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const link = `${base}/reset-password?uid=${user.id}&token=${token}`;
  await sendEmail({
    to: clean,
    subject: "Reset your Coaching LMS password",
    html: `<p>Hello ${user.name ?? ""},</p><p>Click the link below to reset your password (valid for 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  });
  // Visible in server logs when Resend isn't configured (dev / self-host).
  console.log(`[password-reset] link for ${clean}: ${link}`);

  return generic;
}

// Verify the token (hash + expiry), set the new password, and clear the token.
export async function resetPasswordWithToken(input: {
  uid: string;
  token: string;
  newPassword: string;
}): Promise<ActionResult> {
  if (!input.newPassword || input.newPassword.length < 8 || input.newPassword.length > 72) {
    return { ok: false, error: "Password must be 8–72 characters" };
  }
  const user = await db.user.findUnique({
    where: { id: input.uid },
    select: { id: true, resetTokenHash: true, resetTokenExpiry: true },
  });
  if (!user?.resetTokenHash || !user.resetTokenExpiry) {
    return { ok: false, error: "This reset link is invalid or already used" };
  }
  if (user.resetTokenExpiry < new Date()) {
    return { ok: false, error: "This reset link has expired — request a new one" };
  }
  if (sha256(input.token) !== user.resetTokenHash) {
    return { ok: false, error: "This reset link is invalid" };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS),
      resetTokenHash: null,
      resetTokenExpiry: null,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  return { ok: true, info: "Password reset — you can now sign in." };
}
