import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Augment NextAuth types so `role` and `id` are strongly typed everywhere
// (session, middleware req.auth, and the JWT token).
declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

// The JWT interface actually lives in @auth/core/jwt (next-auth/jwt re-exports
// it), so the augmentation must target that module to merge correctly.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
