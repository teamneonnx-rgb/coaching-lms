import type { ReactNode } from "react";
import {
  Box, Rows3, Grid3x3, Minus, MoveVertical,
  Heading, Type, MousePointerClick, Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import type { BlockType } from "@/lib/pages/types";

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
  render: (ctx: RenderCtx) => ReactNode;
};

// prop readers with fallbacks
const s = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0) => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : d);

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
};

export function getBlockDef(type: BlockType): BlockDef | undefined {
  return BLOCK_DEFS[type];
}

export const PALETTE_GROUPS: Array<{ group: BlockDef["group"]; types: BlockType[] }> = [
  { group: "Layout", types: ["container", "row", "grid", "spacer", "divider"] },
  { group: "Content", types: ["heading", "text", "button", "image"] },
];
