// Isomorphic capability catalogue (PRD §3.2) — safe to import from client
// components (nav filtering, matrix UI). Server-side guards live in
// src/lib/capabilities.ts.
export const CAPABILITY_KEYS = [
  "TEACHER_MANAGE",
  "TEACHER_ATTENDANCE",
  "STUDENT_ATTENDANCE_APPROVE",
  "RESULT_MANAGE",
  "TEACHER_VIEW",
  "BATCH_MANAGE",
  "STUDENT_MANAGE",
  "STUDENT_BULK_IMPORT",
  "PAYMENT_VIEW",
  "PAYMENT_COLLECT",
  "PAYMENT_NOTIFY",
  "FEEDBACK_VIEW",
  "ENQUIRY_VIEW",
  "COURSE_MANAGE",
  "DOCUMENT_APPROVE",
  "SESSION_SUMMARY_UPLOAD",
  "REPORT_VIEW",
  "PASSWORD_RESET",
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

export const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  TEACHER_MANAGE: "Create, edit, deactivate teacher accounts",
  TEACHER_ATTENDANCE: "Mark and approve teacher attendance",
  STUDENT_ATTENDANCE_APPROVE: "Approve teacher-submitted student attendance",
  RESULT_MANAGE: "Enter, publish and edit results; override test marks",
  TEACHER_VIEW: "View teacher profiles and drill into their batches",
  BATCH_MANAGE: "Create, rename, archive batches; assign teacher",
  STUDENT_MANAGE: "Create, edit, deactivate student accounts",
  STUDENT_BULK_IMPORT: "Bulk-import students from PDF / DOC / CSV",
  PAYMENT_VIEW: "View per-student payment records",
  PAYMENT_COLLECT: "Record and collect payments",
  PAYMENT_NOTIFY: "Trigger fee reminders and late-payment notifications",
  FEEDBACK_VIEW: "Read parent and student feedback about teachers and courses",
  ENQUIRY_VIEW: "Access the enquiry data tab",
  COURSE_MANAGE: "Upload and manage course documents",
  DOCUMENT_APPROVE: "Approve or reject teacher-uploaded documents",
  SESSION_SUMMARY_UPLOAD: "Publish per-day class session summaries to parent profiles",
  REPORT_VIEW: "View progress, class and batch reports",
  PASSWORD_RESET: "Reset passwords for other users",
};
