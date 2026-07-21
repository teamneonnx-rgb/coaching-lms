import { z } from "zod";

export const attendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "ON_LEAVE"]);
export type AttendanceStatusInput = z.infer<typeof attendanceStatusEnum>;

// Self check-in (student or teacher).
export const markMyAttendanceSchema = z.object({
  status: attendanceStatusEnum,
});

// Teacher marking a batch roster for a given day.
export const batchAttendanceSchema = z.object({
  batchId: z.string().min(1, "Select a batch"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: attendanceStatusEnum,
      })
    )
    .min(1, "No students to mark"),
});
export type BatchAttendanceInput = z.infer<typeof batchAttendanceSchema>;
