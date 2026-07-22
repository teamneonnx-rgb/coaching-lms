"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { saveAccessPolicy } from "@/lib/actions/admin/access-policy";
import type { AccessPolicy } from "@/lib/access-policy";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FIELDS: { key: keyof AccessPolicy; label: string; help: string }[] = [
  {
    key: "contentApproval",
    label: "Require content approval",
    help: "Teacher-added lessons stay hidden until an admin approves them.",
  },
  {
    key: "publicDoubts",
    label: "Public doubts",
    help: "Students can see and answer their batchmates' doubts, not only their own.",
  },
  {
    key: "studentComments",
    label: "Student comments",
    help: "Students may post comments on content resources.",
  },
];

export function AccessControlEditor({ policy, canEdit }: { policy: AccessPolicy; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<AccessPolicy>(policy);
  const [isPending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await saveAccessPolicy(state);
      if (r.ok) {
        toast.success(r.info ?? "Saved");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">Policies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.help}</p>
            </div>
            <Checkbox
              checked={state[f.key]}
              disabled={!canEdit || isPending}
              onCheckedChange={(v) => setState((s) => ({ ...s, [f.key]: v === true }))}
              className="mt-0.5"
            />
          </label>
        ))}
        {canEdit ? (
          <Button onClick={save} disabled={isPending} className="bg-blue-600 text-white hover:bg-blue-600/90">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save policies
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">You have read-only access to policies.</p>
        )}
      </CardContent>
    </Card>
  );
}
