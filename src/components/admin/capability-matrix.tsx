"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { saveAdminCapabilities } from "@/lib/actions/admin/capabilities";
import { CAPABILITY_KEYS, CAPABILITY_LABELS, type CapabilityKey } from "@/lib/capabilities-shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";

type AdminRow = { id: string; name: string; email: string; keys: CapabilityKey[] };

export function CapabilityMatrix({ admins }: { admins: AdminRow[] }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, Set<CapabilityKey>>>(
    Object.fromEntries(admins.map((a) => [a.id, new Set(a.keys)]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function toggle(adminId: string, key: CapabilityKey) {
    setState((s) => {
      const next = new Set(s[adminId]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...s, [adminId]: next };
    });
  }

  function save(adminId: string) {
    setSavingId(adminId);
    start(async () => {
      const r = await saveAdminCapabilities({ adminUserId: adminId, keys: [...state[adminId]] });
      if (r.ok) toast.success(r.info ?? "Saved");
      else toast.error(r.error ?? "Failed");
      setSavingId(null);
      router.refresh();
    });
  }

  if (admins.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-slate-400" /> Admin capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="No Admin accounts yet"
            description="Create an Admin in Users, then grant capabilities here. Admins have no power until granted."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-slate-400" /> Admin capabilities
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Admins hold no inherent power — each switch below is granted by you and takes effect on
          their next request. Every grant/revoke is audit-logged.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {admins.map((a) => (
          <div key={a.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.email} · {state[a.id].size}/{CAPABILITY_KEYS.length} granted</p>
              </div>
              <Button
                size="sm"
                onClick={() => save(a.id)}
                disabled={isPending && savingId === a.id}
                className="bg-blue-600 text-white hover:bg-blue-600/90"
              >
                {isPending && savingId === a.id ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </Button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {CAPABILITY_KEYS.map((key) => (
                <label key={key} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                  <Checkbox
                    checked={state[a.id].has(key)}
                    onCheckedChange={() => toggle(a.id, key)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-medium text-slate-900">{key}</span>
                    <span className="block text-[11px] leading-tight text-muted-foreground">{CAPABILITY_LABELS[key]}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
