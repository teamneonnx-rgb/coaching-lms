import { z } from "zod";

// FR-SA-00: SUPER_ADMIN is a singleton and can never be assigned via a form —
// the role is transfer-only. Admin CRUD may only mint these roles.
export const assignableRoleEnum = z.enum(["ADMIN", "IT", "TEACHER", "STUDENT", "PARENT"]);

// ── Users (Admin CRUD) ─────────────────────────────────────────────
export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  role: assignableRoleEnum,
  parentName: z.string().trim().max(100).optional().or(z.literal("")),
  parentPhone: z.string().trim().max(20).optional().or(z.literal("")),
  parentEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

// On update, password is optional (blank = keep existing).
export const adminUpdateUserSchema = adminCreateUserSchema.extend({
  id: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .optional()
    .or(z.literal("")),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// ── Batches ────────────────────────────────────────────────────────
export const batchSchema = z.object({
  name: z.string().trim().min(2, "Batch name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  startDate: z.coerce.date({ message: "Enter a valid start date" }),
  endDate: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
});
export type BatchInput = z.infer<typeof batchSchema>;

export const updateBatchSchema = batchSchema.extend({ id: z.string().min(1) });
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;

// ── Courses ────────────────────────────────────────────────────────
export const courseSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  batchId: z.string().min(1, "Select a batch"),
  teacherId: z.string().min(1, "Select a teacher"),
});
export type CourseInput = z.infer<typeof courseSchema>;

export const updateCourseSchema = courseSchema.extend({ id: z.string().min(1) });
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// ── Enrollment (assign student to batch) ───────────────────────────
export const enrollSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  batchId: z.string().min(1, "Select a batch"),
});
export type EnrollInput = z.infer<typeof enrollSchema>;
