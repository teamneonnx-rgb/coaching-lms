import { z } from "zod";

// The serialisable page schema (Phase 1 of the builder). A page is a tree of
// blocks; each block is a type + props (+ optional per-breakpoint overrides +
// children). Blocks NEVER carry data or queries — LMS widgets resolve live,
// role-scoped data at render time from the type + props alone.

export const BLOCK_TYPES = [
  // Layout
  "container", "row", "column", "grid", "spacer", "divider",
  // Content
  "heading", "text", "image", "video", "pdf", "button", "htmlEmbed",
  // LMS / ERP data widgets
  "statCard", "studentTable", "batchList", "attendanceWidget", "chart",
  "enquiryTable", "paymentTable", "notificationFeed", "timetable", "syllabusTracker",
  "liveClassCard", "recordedList", "courseList", "testResultWidget", "assignmentList",
  "doubtFeed", "announcementFeed", "parentReportCard", "progressChart", "libraryCatalog",
  "branchSelector", "marketingPanel", "expenseSummary", "payrollSummary",
  // Form
  "input", "select", "fileUpload",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type Breakpoint = "desktop" | "tablet" | "mobile";

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  responsive?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  children?: Block[];
};

// Recursive validation used by the save/publish server actions so an untrusted
// JSON payload can never persist an unknown block type or malformed tree.
export const blockSchema: z.ZodType<Block> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(64),
    type: z.enum(BLOCK_TYPES),
    props: z.record(z.string(), z.unknown()).default({}),
    responsive: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    children: z.array(blockSchema).optional(),
  })
);

export const blockTreeSchema = z.array(blockSchema).max(500); // sane upper bound
