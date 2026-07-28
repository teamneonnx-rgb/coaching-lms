import type { CSSProperties, ReactNode } from "react";
import {
  Box, Rows3, Grid3x3, Minus, MoveVertical,
  Heading, Type, MousePointerClick, Image as ImageIcon, Video, FileText, Code2,
  TextCursorInput, ListFilter, Upload,
  Gauge, Table2, Layers, CalendarCheck, BarChart3,
  Inbox, IndianRupee, Bell, CalendarClock, ListChecks, Radio, PlayCircle,
  BookOpen, Award, ClipboardList, MessagesSquare, Megaphone, FileBarChart,
  LineChart, Library, Building2, ImagePlus, Wallet, Users,
  type LucideIcon,
} from "lucide-react";
import type { BlockType } from "@/lib/pages/types";
import { sanitizeHtml } from "@/lib/pages/sanitize";

// A block definition: palette metadata + inspector field descriptors + the
// shared visual render. The SAME render is used by the editor canvas and the
// published runtime ("what you build is what ships"). Render functions are pure
// (no hooks / no data) — LMS data widgets (Phase 3) resolve data server-side.

export type FieldDef =
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "textarea"; placeholder?: string }
  | { key: string; label: string; type: "number"; min?: number; max?: number }
  | { key: string; label: string; type: "select"; options: { label: string; value: string }[] }
  | { key: string; label: string; type: "color" };

export type RenderCtx = {
  props: Record<string, unknown>;
  children?: ReactNode;
  mode: "editor" | "runtime";
};

export type BlockDef = {
  type: BlockType;
  group: "Layout" | "Content" | "LMS Data" | "Form";
  label: string;
  icon: LucideIcon;
  isContainer: boolean;
  defaults: Record<string, unknown>;
  fields: FieldDef[];
  // Static blocks provide `render`. LMS/data blocks instead set `widget` — a key
  // rendered by WidgetPreview (editor) and, in Phase 4, a server component with
  // real role-scoped data. `wired: false` marks palette placeholders.
  render?: (ctx: RenderCtx) => ReactNode;
  widget?: string;
  wired?: boolean;
};

// prop readers with fallbacks
const s = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0) => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : d);

const placeholderBox: CSSProperties = {
  display: "flex", height: 120, alignItems: "center", justifyContent: "center",
  background: "#f1f5f9", borderRadius: 8, color: "#94a3b8", fontSize: 13,
};

const ALIGN: FieldDef = {
  key: "align", label: "Align", type: "select",
  options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }],
};

export const BLOCK_DEFS: Partial<Record<BlockType, BlockDef>> = {
  // ── Layout ───────────────────────────────────────────────────────
  container: {
    type: "container", group: "Layout", label: "Container", icon: Box, isContainer: true,
    defaults: { padding: 16, gap: 12, background: "#ffffff", radius: 12 },
    fields: [
      { key: "padding", label: "Padding", type: "number", min: 0, max: 96 },
      { key: "gap", label: "Gap between items", type: "number", min: 0, max: 64 },
      { key: "background", label: "Background", type: "color" },
      { key: "radius", label: "Corner radius", type: "number", min: 0, max: 40 },
    ],
    render: ({ props, children }) => (
      <div style={{
        padding: n(props.padding, 16), display: "flex", flexDirection: "column", gap: n(props.gap, 12),
        background: s(props.background, "#ffffff"), borderRadius: n(props.radius, 12),
        border: "1px solid #e2e8f0",
      }}>{children}</div>
    ),
  },
  row: {
    type: "row", group: "Layout", label: "Row", icon: Rows3, isContainer: true,
    defaults: { gap: 12 },
    fields: [{ key: "gap", label: "Gap", type: "number", min: 0, max: 64 }],
    render: ({ props, children }) => (
      <div style={{ display: "flex", flexWrap: "wrap", gap: n(props.gap, 12), alignItems: "stretch" }}>{children}</div>
    ),
  },
  grid: {
    type: "grid", group: "Layout", label: "Grid", icon: Grid3x3, isContainer: true,
    defaults: { columns: 3, gap: 12 },
    fields: [
      { key: "columns", label: "Columns", type: "number", min: 1, max: 6 },
      { key: "gap", label: "Gap", type: "number", min: 0, max: 64 },
    ],
    render: ({ props, children }) => (
      <div style={{
        display: "grid", gap: n(props.gap, 12),
        gridTemplateColumns: `repeat(${Math.max(1, n(props.columns, 3))}, minmax(0, 1fr))`,
      }}>{children}</div>
    ),
  },
  spacer: {
    type: "spacer", group: "Layout", label: "Spacer", icon: MoveVertical, isContainer: false,
    defaults: { height: 24 },
    fields: [{ key: "height", label: "Height", type: "number", min: 4, max: 240 }],
    render: ({ props }) => <div style={{ height: n(props.height, 24) }} aria-hidden />,
  },
  divider: {
    type: "divider", group: "Layout", label: "Divider", icon: Minus, isContainer: false,
    defaults: { color: "#e2e8f0" },
    fields: [{ key: "color", label: "Colour", type: "color" }],
    render: ({ props }) => <hr style={{ border: 0, borderTop: `1px solid ${s(props.color, "#e2e8f0")}`, margin: "8px 0" }} />,
  },

  // ── Content ──────────────────────────────────────────────────────
  heading: {
    type: "heading", group: "Content", label: "Heading", icon: Heading, isContainer: false,
    defaults: { text: "Heading", level: "2", align: "left", color: "#0f172a" },
    fields: [
      { key: "text", label: "Text", type: "text" },
      { key: "level", label: "Level", type: "select", options: [{ label: "H1", value: "1" }, { label: "H2", value: "2" }, { label: "H3", value: "3" }] },
      ALIGN, { key: "color", label: "Colour", type: "color" },
    ],
    render: ({ props }) => {
      const size = s(props.level, "2") === "1" ? 28 : s(props.level, "2") === "3" ? 18 : 22;
      return <p style={{ fontSize: size, fontWeight: 600, color: s(props.color, "#0f172a"), textAlign: s(props.align, "left") as "left", margin: 0 }}>{s(props.text, "Heading")}</p>;
    },
  },
  text: {
    type: "text", group: "Content", label: "Text", icon: Type, isContainer: false,
    defaults: { text: "Add your text here.", align: "left", size: 14, color: "#334155" },
    fields: [
      { key: "text", label: "Text", type: "textarea" },
      ALIGN,
      { key: "size", label: "Font size", type: "number", min: 11, max: 32 },
      { key: "color", label: "Colour", type: "color" },
    ],
    render: ({ props }) => (
      <p style={{ fontSize: n(props.size, 14), color: s(props.color, "#334155"), textAlign: s(props.align, "left") as "left", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {s(props.text, "Add your text here.")}
      </p>
    ),
  },
  button: {
    type: "button", group: "Content", label: "Button", icon: MousePointerClick, isContainer: false,
    defaults: { label: "Click me", href: "#", align: "left", color: "#2563eb" },
    fields: [
      { key: "label", label: "Label", type: "text" },
      { key: "href", label: "Link (href)", type: "text", placeholder: "/student/courses" },
      ALIGN, { key: "color", label: "Colour", type: "color" },
    ],
    render: ({ props, mode }) => {
      const btn = (
        <span style={{
          display: "inline-flex", alignItems: "center", background: s(props.color, "#2563eb"), color: "#fff",
          padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500,
        }}>{s(props.label, "Click me")}</span>
      );
      return (
        <div style={{ textAlign: s(props.align, "left") as "left" }}>
          {mode === "runtime" ? <a href={s(props.href, "#")} style={{ textDecoration: "none" }}>{btn}</a> : btn}
        </div>
      );
    },
  },
  image: {
    type: "image", group: "Content", label: "Image", icon: ImageIcon, isContainer: false,
    defaults: { src: "", alt: "", radius: 8 },
    fields: [
      { key: "src", label: "Image URL", type: "text", placeholder: "https://…/photo.jpg" },
      { key: "alt", label: "Alt text", type: "text" },
      { key: "radius", label: "Corner radius", type: "number", min: 0, max: 40 },
    ],
    render: ({ props }) => {
      const src = s(props.src);
      if (!src) {
        return <div style={{ display: "flex", height: 120, alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: n(props.radius, 8), color: "#94a3b8", fontSize: 13 }}>Set an image URL</div>;
      }
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={s(props.alt)} style={{ maxWidth: "100%", borderRadius: n(props.radius, 8), display: "block" }} />;
    },
  },
  video: {
    type: "video", group: "Content", label: "Video", icon: Video, isContainer: false,
    defaults: { url: "" },
    fields: [{ key: "url", label: "Video URL (YouTube / MP4)", type: "text", placeholder: "https://youtube.com/watch?v=…" }],
    render: ({ props }) => {
      const url = s(props.url);
      if (!url) return <div style={placeholderBox}>Set a video URL</div>;
      const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
      if (yt) {
        return (
          <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden" }}>
            <iframe src={`https://www.youtube.com/embed/${yt[1]}`} title="Video" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
          </div>
        );
      }
      return <video src={url} controls style={{ width: "100%", borderRadius: 8 }} />;
    },
  },
  pdf: {
    type: "pdf", group: "Content", label: "PDF", icon: FileText, isContainer: false,
    defaults: { url: "", height: 480 },
    fields: [
      { key: "url", label: "PDF URL", type: "text", placeholder: "https://…/notes.pdf" },
      { key: "height", label: "Height", type: "number", min: 200, max: 1000 },
    ],
    render: ({ props }) => {
      const url = s(props.url);
      if (!url) return <div style={placeholderBox}>Set a PDF URL</div>;
      return <iframe src={url} title="PDF" style={{ width: "100%", height: n(props.height, 480), border: "1px solid #e2e8f0", borderRadius: 8 }} />;
    },
  },
  htmlEmbed: {
    type: "htmlEmbed", group: "Content", label: "HTML embed", icon: Code2, isContainer: false,
    defaults: { html: "<p>Custom <strong>HTML</strong> goes here.</p>" },
    fields: [{ key: "html", label: "HTML (sanitised on save + render)", type: "textarea", placeholder: "<p>…</p>" }],
    render: ({ props }) => <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(s(props.html)) }} />,
  },

  // ── Form ─────────────────────────────────────────────────────────
  input: {
    type: "input", group: "Form", label: "Text input", icon: TextCursorInput, isContainer: false,
    defaults: { label: "Label", placeholder: "Type here…" },
    fields: [{ key: "label", label: "Field label", type: "text" }, { key: "placeholder", label: "Placeholder", type: "text" }],
    render: ({ props }) => (
      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#334155", marginBottom: 4 }}>{s(props.label, "Label")}</span>
        <input placeholder={s(props.placeholder)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }} />
      </label>
    ),
  },
  select: {
    type: "select", group: "Form", label: "Dropdown", icon: ListFilter, isContainer: false,
    defaults: { label: "Choose", options: "Option A, Option B, Option C" },
    fields: [{ key: "label", label: "Field label", type: "text" }, { key: "options", label: "Options (comma-separated)", type: "text" }],
    render: ({ props }) => (
      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#334155", marginBottom: 4 }}>{s(props.label, "Choose")}</span>
        <select style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }}>
          {s(props.options, "").split(",").map((o, i) => <option key={i}>{o.trim()}</option>)}
        </select>
      </label>
    ),
  },
  fileUpload: {
    type: "fileUpload", group: "Form", label: "File upload", icon: Upload, isContainer: false,
    defaults: { label: "Upload a file" },
    fields: [{ key: "label", label: "Label", type: "text" }],
    render: ({ props }) => (
      <div style={{ border: "2px dashed #cbd5e1", borderRadius: 10, padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>
        <Upload style={{ display: "inline", width: 16, height: 16, verticalAlign: "-3px", marginRight: 6 }} />
        {s(props.label, "Upload a file")}
      </div>
    ),
  },

  // ── LMS Data (core — rendered by WidgetPreview / server runtime) ──
  statCard: {
    type: "statCard", group: "LMS Data", label: "Stat card", icon: Gauge, isContainer: false, widget: "statCard", wired: true,
    defaults: { metric: "students", title: "" },
    fields: [
      { key: "metric", label: "Metric", type: "select", options: [
        { label: "Students", value: "students" }, { label: "Teachers", value: "teachers" },
        { label: "Batches", value: "batches" }, { label: "Courses", value: "courses" },
      ] },
      { key: "title", label: "Title override", type: "text" },
    ],
  },
  studentTable: {
    type: "studentTable", group: "LMS Data", label: "Student table", icon: Table2, isContainer: false, widget: "studentTable", wired: true,
    defaults: { title: "Students", limit: 8 },
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "limit", label: "Max rows", type: "number", min: 1, max: 50 }],
  },
  batchList: {
    type: "batchList", group: "LMS Data", label: "Batch list", icon: Layers, isContainer: false, widget: "batchList", wired: true,
    defaults: { title: "Batches", limit: 6 },
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "limit", label: "Max rows", type: "number", min: 1, max: 50 }],
  },
  attendanceWidget: {
    type: "attendanceWidget", group: "LMS Data", label: "Attendance", icon: CalendarCheck, isContainer: false, widget: "attendanceWidget", wired: true,
    defaults: { title: "Attendance" },
    fields: [{ key: "title", label: "Title", type: "text" }],
  },
  chart: {
    type: "chart", group: "LMS Data", label: "Chart", icon: BarChart3, isContainer: false, widget: "chart", wired: true,
    defaults: { title: "Enrollment growth", source: "enrollments" },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "source", label: "Data source", type: "select", options: [{ label: "Enrollment growth", value: "enrollments" }] },
    ],
  },
};

// The rest of the market-standard ERP widget set — palette-complete now, wired
// to live data incrementally later. Each renders a labelled placeholder.
const PLACEHOLDER_WIDGETS: Array<[BlockType, string, LucideIcon]> = [
  ["enquiryTable", "Enquiry pipeline", Inbox],
  ["paymentTable", "Fees & dues", IndianRupee],
  ["notificationFeed", "Notifications", Bell],
  ["timetable", "Timetable", CalendarClock],
  ["syllabusTracker", "Syllabus tracker", ListChecks],
  ["liveClassCard", "Live class", Radio],
  ["recordedList", "Recorded lectures", PlayCircle],
  ["courseList", "Course list", BookOpen],
  ["testResultWidget", "Test results", Award],
  ["assignmentList", "Assignments", ClipboardList],
  ["doubtFeed", "Doubts / Q&A", MessagesSquare],
  ["announcementFeed", "Announcements", Megaphone],
  ["parentReportCard", "Parent report card", FileBarChart],
  ["progressChart", "Progress tracker", LineChart],
  ["libraryCatalog", "Library catalog", Library],
  ["branchSelector", "Branch selector", Building2],
  ["marketingPanel", "Marketing / posters", ImagePlus],
  ["expenseSummary", "Expense summary", Wallet],
  ["payrollSummary", "Payroll summary", Users],
];

for (const [type, label, icon] of PLACEHOLDER_WIDGETS) {
  BLOCK_DEFS[type] = {
    type, group: "LMS Data", label, icon, isContainer: false,
    defaults: { title: label }, fields: [{ key: "title", label: "Title", type: "text" }],
    widget: type, wired: false,
  };
}

export function getBlockDef(type: BlockType): BlockDef | undefined {
  return BLOCK_DEFS[type];
}

export const PALETTE_GROUPS: Array<{ group: BlockDef["group"]; types: BlockType[] }> = [
  { group: "Layout", types: ["container", "row", "grid", "spacer", "divider"] },
  { group: "Content", types: ["heading", "text", "button", "image", "video", "pdf", "htmlEmbed"] },
  { group: "LMS Data", types: ["statCard", "studentTable", "batchList", "attendanceWidget", "chart", ...PLACEHOLDER_WIDGETS.map((w) => w[0])] },
  { group: "Form", types: ["input", "select", "fileUpload"] },
];
