"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2, AlertTriangle, Download, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { bulkImportStudents, type ImportResult } from "@/lib/actions/admin/enrollment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const HEADERS = ["name", "email", "parentName", "parentPhone", "parentEmail"] as const;
type Field = (typeof HEADERS)[number];
type Row = Record<Field, string> & { _errors: string[] };

const TEMPLATE = `name,email,parentName,parentPhone,parentEmail
Aarav Sharma,aarav@example.com,Meena Sharma,+919000000001,meena@example.com
Diya Patel,diya@example.com,Rakesh Patel,+919000000002,rakesh@example.com`;

// Split a CSV line respecting simple double-quoted fields.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function validate(r: Record<Field, string>): string[] {
  const errs: string[] = [];
  if (!r.name || r.name.length < 2) errs.push("name");
  if (!r.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errs.push("email");
  if (!r.parentPhone && !r.parentEmail) errs.push("parent contact");
  if (r.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.parentEmail)) errs.push("parentEmail");
  return errs;
}

function parse(text: string): Row[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (f: string) => header.indexOf(f.toLowerCase());
  // Support header row or headerless (assume canonical order).
  const hasHeader = HEADERS.some((h) => header.includes(h));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line) => {
    const cols = splitCsvLine(line);
    const get = (f: Field, pos: number) => (hasHeader && idx(f) >= 0 ? cols[idx(f)] : cols[pos]) ?? "";
    const base: Record<Field, string> = {
      name: get("name", 0),
      email: (get("email", 1) || "").toLowerCase(),
      parentName: get("parentName", 2),
      parentPhone: get("parentPhone", 3),
      parentEmail: (get("parentEmail", 4) || "").toLowerCase(),
    };
    return { ...base, _errors: validate(base) };
  });
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function BulkImportForm({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [stage, setStage] = useState<"upload" | "preview">("upload");
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [batchId, setBatchId] = useState<string>("none");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const [extracting, setExtracting] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // FR-AD-29/31: PDF/DOC are text-extracted, then parsed into rows; the
    // preview lets the admin correct anything the heuristic missed.
    if (/\.(pdf|docx?)$/i.test(file.name)) {
      setExtracting(true);
      try {
        const { extractTextFromFile, looseTextToCsv } = await import("@/lib/client-extract");
        const text = await extractTextFromFile(file);
        const csv = looseTextToCsv(text);
        setRaw(csv);
        const parsed = parse(csv);
        if (parsed.length === 0) { toast.error("Couldn't find any rows in that file"); return; }
        setRows(parsed);
        setStage("preview");
        toast.success(`Extracted ${parsed.length} row(s) — review before committing`);
      } catch (err) {
        console.error(err);
        toast.error("Couldn't read that file — try exporting to CSV");
      } finally {
        setExtracting(false);
      }
      return;
    }
    setRaw(await file.text());
  }

  function preview() {
    const parsed = parse(raw);
    if (parsed.length === 0) { toast.error("No rows found"); return; }
    setRows(parsed);
    setStage("preview");
  }

  function edit(i: number, field: Field, value: string) {
    setRows((prev) => {
      const next = [...prev];
      const r = { ...next[i], [field]: field.includes("Email") ? value.toLowerCase() : value };
      r._errors = validate(r);
      next[i] = r;
      return next;
    });
  }

  const valid = rows.filter((r) => r._errors.length === 0);
  const invalid = rows.filter((r) => r._errors.length > 0);

  // NFR-04: commit in chunks so a 2,000+ row import never hits a single-request
  // timeout; progress is shown as batches complete.
  const CHUNK = 100;
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  function commit() {
    // FR-AD-33/34: only valid rows are written; nothing was written at preview.
    // Strip commas from fields (the server parser splits on comma and isn't
    // quote-aware) — validated values never legitimately contain commas.
    const cell = (v: string) => (v ?? "").replaceAll(",", " ");
    const toCsv = (batch: Row[]) =>
      HEADERS.join(",") + "\n" + batch.map((r) => HEADERS.map((h) => cell(r[h])).join(",")).join("\n");

    startTransition(async () => {
      const created: NonNullable<ImportResult["created"]> = [];
      const skipped: NonNullable<ImportResult["skipped"]> = [];
      setProgress({ done: 0, total: valid.length });
      for (let i = 0; i < valid.length; i += CHUNK) {
        const batch = valid.slice(i, i + CHUNK);
        const res = await bulkImportStudents({ csv: toCsv(batch), batchId: batchId === "none" ? undefined : batchId });
        if (!res.ok) { toast.error(res.error ?? "Import failed"); setProgress(null); return; }
        created.push(...(res.created ?? []));
        skipped.push(...(res.skipped ?? []));
        setProgress({ done: Math.min(i + CHUNK, valid.length), total: valid.length });
      }
      setProgress(null);
      setResult({ ok: true, created, skipped });
      setStage("upload");
      setRaw(""); setRows([]);
      toast.success(`Imported ${created.length} student(s)`);
      router.refresh();
    });
  }

  // ── Stage 2: preview ──
  if (stage === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStage("upload")}><ArrowLeft className="size-4" /> Back</Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{valid.length} valid</span>
            {invalid.length > 0 ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{invalid.length} need fixing</span> : null}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>{["Name", "Email", "Parent name", "Parent phone", "Parent email", ""].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={r._errors.length ? "bg-red-50/40" : ""}>
                  {HEADERS.map((f) => (
                    <td key={f} className="px-1 py-1">
                      <Input
                        value={r[f]}
                        onChange={(e) => edit(i, f, e.target.value)}
                        className={`h-7 text-xs ${r._errors.includes(f) || (f === "parentPhone" && r._errors.includes("parent contact")) ? "border-red-300" : ""}`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-[11px] text-red-600">{r._errors.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-1.5 sm:max-w-72">
          <Label>Auto-enroll into batch (optional)</Label>
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Don&apos;t enroll</SelectItem>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={commit} disabled={isPending || valid.length === 0} className="bg-blue-600 text-white hover:bg-blue-600/90">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {progress ? `Importing ${progress.done}/${progress.total}…` : `Commit ${valid.length} valid row(s)`}
          </Button>
          {invalid.length > 0 ? (
            <Button variant="outline" onClick={() => download("import-errors.csv", HEADERS.join(",") + ",errors\n" + invalid.map((r) => HEADERS.map((h) => `"${r[h] ?? ""}"`).join(",") + `,"${r._errors.join("; ")}"`).join("\n"))}>
              <Download className="size-4" /> Download error rows
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Stage 1: upload ──
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => download("student-import-template.csv", TEMPLATE)}>
          <FileSpreadsheet className="size-4" /> Download template
        </Button>
        <Input type="file" accept=".csv,text/csv,.pdf,.doc,.docx" onChange={onFile} disabled={extracting} className="h-9 w-fit text-xs" />
        {extracting ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Extracting…</span> : null}
      </div>

      <div className="grid gap-1.5">
        <Label>…or paste CSV</Label>
        <p className="text-xs text-muted-foreground">Header row: <code>name,email,parentName,parentPhone,parentEmail</code></p>
        <Textarea rows={8} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={TEMPLATE} className="font-mono text-xs" />
        <button type="button" className="w-fit text-xs text-blue-600 hover:underline" onClick={() => setRaw(TEMPLATE)}>Insert sample</button>
      </div>

      <Button onClick={preview} disabled={raw.trim().length === 0} className="bg-blue-600 text-white hover:bg-blue-600/90">
        Parse &amp; preview
      </Button>
      <p className="text-xs text-muted-foreground">Upload CSV, PDF or DOC/DOCX — files are text-extracted into a preview you can correct. Nothing is saved until you confirm. Large lists commit in batches.</p>

      {result ? (
        <div className="space-y-4 pt-2">
          {result.created && result.created.length > 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-green-800">
                <CheckCircle2 className="size-4" /> Created {result.created.length} — temporary passwords (share securely)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-green-700"><tr><th className="pr-4">Name</th><th className="pr-4">Email</th><th>Temp password</th></tr></thead>
                  <tbody className="text-slate-700">
                    {result.created.map((c) => (
                      <tr key={c.email}><td className="pr-4">{c.name}</td><td className="pr-4">{c.email}</td><td className="font-mono">{c.tempPassword}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {result.skipped && result.skipped.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800"><AlertTriangle className="size-4" /> Skipped {result.skipped.length} at commit</p>
              <ul className="space-y-0.5 text-xs text-amber-700">{result.skipped.map((s, i) => <li key={i}>{s.email} — {s.reason}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
