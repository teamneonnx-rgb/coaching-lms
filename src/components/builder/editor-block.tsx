"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Copy, Trash2 } from "lucide-react";
import type { Block } from "@/lib/pages/types";
import { getBlockDef } from "@/lib/pages/registry";
import { resolveProps } from "@/lib/pages/tree";
import { useEditorCtx } from "./editor-context";
import { DropZone } from "./drop-zone";

// One block on the canvas: selection outline + floating toolbar (drag handle,
// duplicate, delete) wrapped around the block's shared visual. Recurses for
// containers, interleaving drop zones between children.
export function EditorBlock({ block }: { block: Block }) {
  const { api, breakpoint } = useEditorCtx();
  const def = getBlockDef(block.type);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    data: { source: "canvas", id: block.id },
  });

  if (!def) return null;
  const selected = api.selectedId === block.id;
  const props = resolveProps(block, breakpoint);

  let childrenSlot: React.ReactNode = undefined;
  if (def.isContainer) {
    const kids = block.children ?? [];
    childrenSlot =
      kids.length === 0 ? (
        <DropZone parentId={block.id} index={0} big />
      ) : (
        <>
          <DropZone parentId={block.id} index={0} />
          {kids.map((c, i) => (
            <div key={c.id}>
              <EditorBlock block={c} />
              <DropZone parentId={block.id} index={i + 1} />
            </div>
          ))}
        </>
      );
  }

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        api.select(block.id);
      }}
      className="group relative"
      style={{
        outline: selected ? "2px solid #2563eb" : "1px solid transparent",
        outlineOffset: 2,
        borderRadius: 6,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div
        className={`absolute -top-3 right-1 z-10 items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1 py-0.5 shadow-sm ${
          selected ? "flex" : "hidden group-hover:flex"
        }`}
      >
        <button
          {...attributes}
          {...listeners}
          className="flex size-5 cursor-grab items-center justify-center text-slate-400 hover:text-slate-700"
          title="Drag to move"
          aria-label="Drag to move"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5" />
        </button>
        <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{def.label}</span>
        <button
          className="flex size-5 items-center justify-center text-slate-400 hover:text-slate-700"
          title="Duplicate"
          aria-label="Duplicate"
          onClick={(e) => { e.stopPropagation(); api.duplicate(block.id); }}
        >
          <Copy className="size-3.5" />
        </button>
        <button
          className="flex size-5 items-center justify-center text-slate-400 hover:text-red-600"
          title="Delete"
          aria-label="Delete"
          onClick={(e) => { e.stopPropagation(); api.remove(block.id); }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {def.render({ props, children: childrenSlot, mode: "editor" })}
    </div>
  );
}
