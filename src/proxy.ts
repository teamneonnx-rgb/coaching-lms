import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge proxy (formerly "middleware") — inspects the JWT (via authConfig, no
// DB/bcrypt) and enforces the /admin, /teacher, /student access rules
// (FR-AUTH-02). Next.js 16 renamed this file convention to `proxy`.
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Run on everything except Next internals, API routes, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
