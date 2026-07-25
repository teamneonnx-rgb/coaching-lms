"use client";

import type { Breakpoint } from "@/lib/pages/types";
import { RenderTree } from "@/components/blocks/render-block";
import { useEditorCtx } from "./editor-context";
import { EditorBlock } from "./editor-block";
import { DropZone } from "./drop-zone";

const WIDTHS: Record<Breakpoint, number | undefined> = { desktop: undefined, tablet: 768, mobile: 375 };

export function Canvas({ preview }: { preview: boolean }) {
  const { api, breakpoint } = useEditorCtx();
  const maxWidth = WIDTHS[breakpoint];
  const empty = api.tree.length === 0;

  return (
    <div className="flex justify-center">
      <div
        className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all"
        style={{ maxWidth }}
      >
        {preview ? (
          empty ? (
            <p className="py-16 text-center text-sm text-slate-400">Nothing to preview yet.</p>
          ) : (
            <RenderTree tree={api.tree} breakpoint={breakpoint} />
          )
        ) : (
          <div onClick={() => api.select(null)} className="min-h-[300px]">
            {empty ? (
              <DropZone parentId={null} index={0} big />
            ) : (
              <>
                <DropZone parentId={null} index={0} />
                {api.tree.map((b, i) => (
                  <div key={b.id}>
                    <EditorBlock block={b} />
                    <DropZone parentId={null} index={i + 1} />
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
