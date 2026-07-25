"use client";

import Link from "next/link";
import {
  ArrowLeft, Monitor, Tablet, Smartphone, Undo2, Redo2, Eye, Pencil, Check, Loader2, CircleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Breakpoint } from "@/lib/pages/types";
import type { EditorApi } from "./use-editor";

export type SaveState = "idle" | "saving" | "saved" | "error";

const BREAKPOINTS: Array<{ key: Breakpoint; icon: typeof Monitor; label: string }> = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="flex items-center gap-1 text-xs text-slate-400"><Loader2 className="size-3 animate-spin" /> Saving…</span>;
  if (state === "saved") return <span className="flex items-center gap-1 text-xs text-green-600"><Check className="size-3" /> Saved</span>;
  if (state === "error") return <span className="flex items-center gap-1 text-xs text-red-600"><CircleAlert className="size-3" /> Save failed</span>;
  return null;
}

export function Toolbar({
  pageName, api, breakpoint, setBreakpoint, preview, setPreview, saveState,
}: {
  pageName: string;
  api: EditorApi;
  breakpoint: Breakpoint;
  setBreakpoint: (b: Breakpoint) => void;
  preview: boolean;
  setPreview: (p: boolean) => void;
  saveState: SaveState;
}) {
  const iconBtn = "flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/admin/pages" className={iconBtn} aria-label="Back to pages"><ArrowLeft className="size-4" /></Link>
        <span className="truncate text-sm font-medium text-slate-900">{pageName}</span>
        <SaveBadge state={saveState} />
      </div>

      <div className="flex items-center gap-1">
        <div className="mr-1 hidden items-center rounded-lg border border-slate-200 p-0.5 sm:flex">
          {BREAKPOINTS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setBreakpoint(key)}
              title={label}
              aria-label={label}
              className={cn("flex size-7 items-center justify-center rounded-md", breakpoint === key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
        <button className={iconBtn} onClick={api.undo} disabled={!api.canUndo} title="Undo" aria-label="Undo"><Undo2 className="size-4" /></button>
        <button className={iconBtn} onClick={api.redo} disabled={!api.canRedo} title="Redo" aria-label="Redo"><Redo2 className="size-4" /></button>
        <button
          onClick={() => setPreview(!preview)}
          className="ml-1 flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {preview ? <><Pencil className="size-3.5" /> Edit</> : <><Eye className="size-3.5" /> Preview</>}
        </button>
      </div>
    </div>
  );
}
