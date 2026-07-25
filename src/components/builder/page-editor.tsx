"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, pointerWithin,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import type { Block, Breakpoint, BlockType } from "@/lib/pages/types";
import { newBlock } from "@/lib/pages/tree";
import { getBlockDef } from "@/lib/pages/registry";
import { savePageDraft } from "@/lib/actions/admin/pages";
import { useEditor } from "./use-editor";
import { EditorContext } from "./editor-context";
import { Palette } from "./palette";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { Toolbar, type SaveState } from "./toolbar";

export function PageEditor({ page }: { page: { id: string; name: string; blocks: Block[] } }) {
  const api = useEditor(page.blocks);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Debounced autosave (skip the initial mount so opening a page doesn't write).
  const firstRun = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await savePageDraft({ id: page.id, blocks: api.tree });
      setSaveState(res.ok ? "saved" : "error");
      if (!res.ok) toast.error(res.error ?? "Autosave failed");
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [api.tree, page.id]);

  function onDragStart(e: DragStartEvent) {
    const d = e.active.data.current as { source?: string; type?: BlockType } | undefined;
    if (d?.source === "palette" && d.type) setActiveLabel(getBlockDef(d.type)?.label ?? "Component");
    else if (d?.source === "canvas") setActiveLabel("Moving block");
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveLabel(null);
    const over = e.over;
    if (!over) return;
    const target = over.data.current as { parentId: string | null; index: number } | undefined;
    if (!target) return;
    const a = e.active.data.current as { source?: string; type?: BlockType; id?: string } | undefined;
    if (a?.source === "palette" && a.type) {
      api.insert(newBlock(a.type), target.parentId, target.index);
    } else if (a?.source === "canvas" && a.id) {
      api.move(a.id, target.parentId, target.index);
    }
  }

  return (
    <EditorContext.Provider value={{ api, breakpoint }}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveLabel(null)}
      >
        <div className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Toolbar
            pageName={page.name}
            api={api}
            breakpoint={breakpoint}
            setBreakpoint={setBreakpoint}
            preview={preview}
            setPreview={setPreview}
            saveState={saveState}
          />
          <div className="flex min-h-0 flex-1">
            {!preview && (
              <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-slate-200 p-3 md:block">
                <Palette />
              </aside>
            )}
            <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 p-4">
              <Canvas preview={preview} />
            </main>
            {!preview && (
              <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-slate-200 p-3 lg:block">
                <Inspector />
              </aside>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLabel ? (
            <div className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-md">
              {activeLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </EditorContext.Provider>
  );
}
