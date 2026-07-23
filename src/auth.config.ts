import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import { ROLE_PREFIX, homeForRole } from "@/lib/roles";

// Edge-safe config: NO Prisma / bcrypt imports here so it can run in
// middleware (Edge runtime). The Credentials provider (which needs the DB)
// is added in auth.ts. Callbacks here are pure and shared by both.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // FR-AU-04: configurable idle session expiry (minutes; default 12h).
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.SESSION_IDLE_MINUTES ?? 720) * 60,
    updateAge: 5 * 60, // sliding window — activity extends the session
  },
  trustHost: true,
  providers: [], // populated in auth.ts
  callbacks: {
    // Persist id + role into the JWT at sign-in (FR-AUTH-01/02).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    // Expose id + role on the session for Server Components and middleware.
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    // Runs on every matched request via middleware. Enforces RBAC by
    // inspecting the JWT-derived session (FR-AUTH-02).
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      const isProtected =
        pathname.startsWith("/admin") ||
        pathname.startsWith("/teacher") ||
        pathname.startsWith("/student") ||
        pathname.startsWith("/parent") ||
        pathname.startsWith("/it");

      // Unauthenticated hitting a protected area → send to /login.
      if (isProtected && !isLoggedIn) return false;

      // Authenticated but wrong role area → bounce to their own home.
      if (isProtected && role) {
        const allowedPrefix = ROLE_PREFIX[role];
        if (!pathname.startsWith(allowedPrefix)) {
          return Response.redirect(new URL(homeForRole(role), nextUrl));
        }
      }

      // Already logged in and visiting the auth pages → go to role home.
      if (isLoggedIn && role && (pathname === "/login" || pathname === "/register")) {
        return Response.redirect(new URL(homeForRole(role), nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
