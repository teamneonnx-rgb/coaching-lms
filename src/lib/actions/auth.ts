"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/auth";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

export type ActionState = { error?: string; fieldErrors?: Record<string, string[]> };

const BCRYPT_ROUNDS = 12; // FR-AUTH-03: salt rounds >= 10

// Login — validates with Zod, then delegates to NextAuth Credentials.
// On success signIn throws a redirect to /dashboard (re-thrown below).
export async function loginAction(values: unknown): Promise<ActionState> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error; // NEXT_REDIRECT — must propagate
  }
}

// Public registration — STUDENT only. Hashes the password (bcrypt, 12 rounds)
// before persistence, then signs the new student in.
export async function registerAction(values: unknown): Promise<ActionState> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashed = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  await db.user.create({
    data: {
      name: data.name,
      email,
      password: hashed,
      role: "STUDENT",
      parentName: data.parentName || null,
      parentPhone: data.parentPhone || null,
      parentEmail: data.parentEmail || null,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: data.password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created — please sign in" };
    }
    throw error; // NEXT_REDIRECT
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
