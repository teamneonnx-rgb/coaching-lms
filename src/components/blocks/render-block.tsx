"use client";

import type { Block, Breakpoint } from "@/lib/pages/types";
import { getBlockDef } from "@/lib/pages/registry";
import { resolveProps } from "@/lib/pages/tree";

// Plain recursive renderer (no editor chrome) — powers Preview mode now and the
// published runtime later. Uses the same registry.render as the editor, so the
// preview is exactly what ships.
export function RenderBlock({ block, breakpoint }: { block: Block; breakpoint: Breakpoint }) {
  const def = getBlockDef(block.type);
  if (!def) return null;
  const props = resolveProps(block, breakpoint);
  const children = def.isContainer
    ? (block.children ?? []).map((c) => <RenderBlock key={c.id} block={c} breakpoint={breakpoint} />)
    : undefined;
  return <>{def.render({ props, children, mode: "runtime" })}</>;
}

export function RenderTree({ tree, breakpoint }: { tree: Block[]; breakpoint: Breakpoint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {tree.map((b) => (
        <RenderBlock key={b.id} block={b} breakpoint={breakpoint} />
      ))}
    </div>
  );
}
