import { z } from "zod";

// Zod schemas — all Server Action / auth inputs are validated here (NFR-SEC-02).

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const roleEnum = z.enum(["ADMIN", "TEACHER", "STUDENT"]);

// Public self-registration is STUDENT-only (prevents privilege escalation).
// ADMIN / TEACHER accounts are provisioned via Admin CRUD (Phase 3).
// Students must supply a parent contact so attendance alerts work (FR-ATT-02).
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string(),
    parentName: z.string().trim().min(2, "Parent name is required").max(100),
    parentPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{7,20}$/, "Enter a valid phone number"),
    parentEmail: z
      .string()
      .trim()
      .email("Enter a valid parent email")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// Reused by Admin "create user" CRUD in Phase 3 (any role).
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().min(1).email(),
  password: z.string().min(8).max(72),
  role: roleEnum,
  parentName: z.string().trim().max(100).optional().or(z.literal("")),
  parentPhone: z.string().trim().max(20).optional().or(z.literal("")),
  parentEmail: z.string().trim().email().optional().or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
