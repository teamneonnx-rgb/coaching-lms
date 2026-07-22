"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2, RotateCcw, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { replyToDoubt, resolveDoubt, acceptReply } from "@/lib/actions/discussion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ThreadReply = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  isAccepted: boolean;
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Admin",
  ADMIN: "Admin",
  IT: "IT",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent",
};

export function DoubtThread({
  doubtId,
  isResolved,
  canResolve,
  canAccept,
  accent = "teal",
  replies,
}: {
  doubtId: string;
  isResolved: boolean;
  canResolve: boolean;
  canAccept: boolean;
  accent?: "teal" | "orange";
  replies: ThreadReply[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, start] = useTransition();
  const btn = accent === "orange" ? "bg-orange-500 hover:bg-orange-500/90" : "bg-teal-600 hover:bg-teal-600/90";

  function send() {
    start(async () => {
      const r = await replyToDoubt({ doubtId, body });
      if (r.ok) {
        setBody("");
        toast.success(r.info ?? "Replied");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  function toggleResolve() {
    start(async () => {
      const r = await resolveDoubt(doubtId, !isResolved);
      if (r.ok) {
        toast.success(r.info ?? "Updated");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  function accept(replyId: string) {
    start(async () => {
      const r = await acceptReply(replyId);
      if (r.ok) {
        toast.success(r.info ?? "Accepted");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={isResolved
          ? "inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
          : "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"}>
          {isResolved ? <CheckCircle2 className="size-3" /> : null}
          {isResolved ? "Resolved" : "Open"}
        </span>
        {canResolve ? (
          <Button variant="outline" size="sm" onClick={toggleResolve} disabled={isPending}>
            {isResolved ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
            {isResolved ? "Reopen" : "Mark resolved"}
          </Button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {replies.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-muted-foreground">
            No replies yet.
          </li>
        ) : (
          replies.map((r) => (
            <li key={r.id} className={`rounded-lg border p-4 ${r.isAccepted ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-white"}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{r.authorName}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {ROLE_LABEL[r.authorRole] ?? r.authorRole}
                  </span>
                  {r.isAccepted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                      <BadgeCheck className="size-3.5" /> Accepted answer
                    </span>
                  ) : null}
                </div>
                {canAccept && !r.isAccepted ? (
                  <Button variant="ghost" size="sm" onClick={() => accept(r.id)} disabled={isPending} className="h-7 text-xs">
                    Accept
                  </Button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{r.body}</p>
            </li>
          ))
        )}
      </ul>

      <div className="space-y-2">
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" />
        <Button onClick={send} disabled={isPending || body.trim().length === 0} className={`text-white ${btn}`}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Reply
        </Button>
      </div>
    </div>
  );
}
