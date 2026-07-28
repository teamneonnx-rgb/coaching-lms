"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTenant } from "@/lib/actions/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const EMPTY = { instituteName: "", adminName: "", adminEmail: "", adminPassword: "" };

export function CreateTenantDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [pending, start] = useTransition();

  const upd = (k: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function submit() {
    start(async () => {
      const res = await createTenant(f);
      if (res.ok) {
        toast.success("Tenant created");
        setOpen(false);
        setF(EMPTY);
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not create tenant");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4" /> New tenant</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a tenant</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Institute name</Label>
            <Input value={f.instituteName} onChange={upd("instituteName")} placeholder="Rise Academy" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>Owner admin name</Label>
            <Input value={f.adminName} onChange={upd("adminName")} placeholder="Priya Sharma" />
          </div>
          <div className="grid gap-1.5">
            <Label>Owner admin email</Label>
            <Input type="email" value={f.adminEmail} onChange={upd("adminEmail")} placeholder="admin@riseacademy.com" />
          </div>
          <div className="grid gap-1.5">
            <Label>Temporary password</Label>
            <Input value={f.adminPassword} onChange={upd("adminPassword")} placeholder="At least 8 characters" />
          </div>
          <p className="text-xs text-muted-foreground">The admin is prompted to change this on first login — share it securely.</p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} Create tenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
