"use client";

import { useDroppable } from "@dnd-kit/core";

// A drop target. Thin "bar" zones sit between blocks (insert/reorder); the
// "big" variant is the empty-container / empty-canvas target.
export function DropZone({
  parentId,
  index,
  big = false,
}: {
  parentId: string | null;
  index: number;
  big?: boolean;
}) {
  const id = `dz:${parentId ?? "root"}:${index}`;
  const { setNodeRef, isOver, active } = useDroppable({ id, data: { parentId, index } });
  const dragging = !!active;

  if (big) {
    return (
      <div
        ref={setNodeRef}
        className="rounded-lg border-2 border-dashed py-6 text-center text-xs transition-colors"
        style={{
          borderColor: isOver ? "#2563eb" : "#cbd5e1",
          color: isOver ? "#2563eb" : "#94a3b8",
          background: isOver ? "#eff6ff" : "transparent",
        }}
      >
        Drop components here
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={{ height: dragging ? 10 : 3, transition: "height .1s" }}>
      <div
        className="mx-1 rounded"
        style={{ height: isOver ? 4 : 2, background: isOver ? "#2563eb" : "transparent", transition: "all .1s" }}
      />
    </div>
  );
}
