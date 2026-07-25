"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search } from "lucide-react";
import type { BlockType } from "@/lib/pages/types";
import { getBlockDef, PALETTE_GROUPS } from "@/lib/pages/registry";

function PaletteItem({ type }: { type: BlockType }) {
  const def = getBlockDef(type);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { source: "palette", type },
  });
  if (!def) return null;
  const Icon = def.icon;
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <Icon className="size-4 shrink-0 text-slate-500" />
      <span className="truncate">{def.label}</span>
    </button>
  );
}

export function Palette() {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search components…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-slate-300 focus:bg-white"
        />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {PALETTE_GROUPS.map((g) => {
          const types = g.types.filter((t) => {
            const def = getBlockDef(t);
            return def && (!query || def.label.toLowerCase().includes(query));
          });
          if (types.length === 0) return null;
          return (
            <div key={g.group}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{g.group}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {types.map((t) => <PaletteItem key={t} type={t} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
