"use client";

import { Trash2 } from "lucide-react";
import { findBlock, resolveProps } from "@/lib/pages/tree";
import { getBlockDef, type FieldDef } from "@/lib/pages/registry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEditorCtx } from "./editor-context";

function Field({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const str = typeof value === "string" ? value : value == null ? "" : String(value);

  return (
    <div className="grid gap-1">
      <Label className="text-xs">{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea rows={3} value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} className="text-sm" />
      ) : field.type === "number" ? (
        <Input
          type="number"
          value={str}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="h-8 text-sm"
        />
      ) : field.type === "select" ? (
        <select
          value={str}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-slate-400"
        >
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : field.type === "color" ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(str) ? str : "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
            aria-label={field.label}
          />
          <Input value={str} onChange={(e) => onChange(e.target.value)} className="h-8 flex-1 font-mono text-xs" />
        </div>
      ) : (
        <Input value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
      )}
    </div>
  );
}

export function Inspector() {
  const { api, breakpoint } = useEditorCtx();
  const block = api.selectedId ? findBlock(api.tree, api.selectedId) : null;

  if (!block) {
    return <p className="px-1 py-6 text-center text-xs text-slate-400">Select a block on the canvas to edit its settings.</p>;
  }
  const def = getBlockDef(block.type);
  if (!def) return null;
  const props = resolveProps(block, breakpoint);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900">{def.label}</p>
        <button
          onClick={() => api.remove(block.id)}
          className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
          title="Delete block"
          aria-label="Delete block"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {breakpoint !== "desktop" && (
        <div className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">
          Edits apply to the <span className="font-medium">{breakpoint}</span> view only.
        </div>
      )}

      {def.fields.map((f) => (
        <Field key={f.key} field={f} value={props[f.key]} onChange={(v) => api.updateProps(block.id, { [f.key]: v }, breakpoint)} />
      ))}
    </div>
  );
}
