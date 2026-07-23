import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validations/auth";

// Full auth instance (Node runtime): includes the Credentials provider,
// which needs Prisma + bcrypt and therefore cannot live in the edge config.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // FR-AU-01: email OR phone as the login identifier.
        const identifier = email.toLowerCase();
        const user = await db.user.findFirst({
          where: { OR: [{ email: identifier }, { phone: identifier }] },
        });
        if (!user) return null;
        // Deleted or suspended accounts cannot sign in (FR-AUTH-9, FR-DATA-2).
        if (user.deletedAt || user.status === "SUSPENDED") return null;

        // FR-AU-05: locked accounts cannot sign in until the window passes or
        // an admin unlocks them.
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        // FR-AUTH-03: compare against the bcrypt hash.
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          // FR-AU-05: lock after 5 consecutive failures for 15 minutes.
          const attempts = user.failedLoginAttempts + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
          });
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
