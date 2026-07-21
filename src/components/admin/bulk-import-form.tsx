"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { bulkImportStudents, type ImportResult } from "@/lib/actions/admin/enrollment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SAMPLE = `name,email,parentName,parentPhone,parentEmail
Aarav Sharma,aarav@example.com,Meena Sharma,+919000000001,meena@example.com
Diya Patel,diya@example.com,Rakesh Patel,+919000000002,rakesh@example.com`;

export function BulkImportForm({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [batchId, setBatchId] = useState<string>("none");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = await bulkImportStudents({
        csv,
        batchId: batchId === "none" ? undefined : batchId,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Import failed");
        return;
      }
      setResult(res);
      toast.success(`Imported ${res.created?.length ?? 0} student(s)`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        <Label>CSV data</Label>
        <p className="text-xs text-muted-foreground">
          Header row required: <code>name,email,parentName,parentPhone,parentEmail</code>
        </p>
        <Textarea
          rows={10}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={SAMPLE}
          className="font-mono text-xs"
        />
        <button
          type="button"
          className="w-fit text-xs text-blue-600 hover:underline"
          onClick={() => setCsv(SAMPLE)}
        >
          Insert sample
        </button>
      </div>

      <div className="grid gap-1.5">
        <Label>Auto-enroll into batch (optional)</Label>
        <Select value={batchId} onValueChange={setBatchId}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Don&apos;t enroll</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={submit}
        disabled={isPending || csv.trim().length === 0}
        className="bg-blue-600 text-white hover:bg-blue-600/90"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Import students
      </Button>

      {result ? (
        <div className="space-y-4 pt-2">
          {result.created && result.created.length > 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-green-800">
                <CheckCircle2 className="size-4" /> Created {result.created.length} — temporary passwords (share securely)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-green-700">
                    <tr>
                      <th className="pr-4">Name</th>
                      <th className="pr-4">Email</th>
                      <th>Temp password</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {result.created.map((c) => (
                      <tr key={c.email}>
                        <td className="pr-4">{c.name}</td>
                        <td className="pr-4">{c.email}</td>
                        <td className="font-mono">{c.tempPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {result.skipped && result.skipped.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertTriangle className="size-4" /> Skipped {result.skipped.length}
              </p>
              <ul className="space-y-0.5 text-xs text-amber-700">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    {s.email} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
