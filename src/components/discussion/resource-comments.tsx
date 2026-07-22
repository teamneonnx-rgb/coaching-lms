"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { postComment, deleteComment } from "@/lib/actions/discussion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ResourceCommentItem = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
  isMine: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Admin", ADMIN: "Admin", IT: "IT", TEACHER: "Teacher", STUDENT: "Student", PARENT: "Parent",
};

export function ResourceComments({
  resourceId,
  comments,
  canComment = true,
}: {
  resourceId: string;
  comments: ResourceCommentItem[];
  canComment?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, start] = useTransition();

  function post() {
    start(async () => {
      const r = await postComment({ resourceId, body });
      if (r.ok) {
        setBody("");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await deleteComment(id);
      if (r.ok) router.refresh();
      else toast.error(r.error ?? "Failed");
    });
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <MessageSquare className="size-4 text-slate-400" /> Discussion ({comments.length})
      </h2>

      <ul className="mb-4 space-y-3">
        {comments.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-muted-foreground">
            No comments yet. Start the discussion.
          </li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{c.authorName}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {ROLE_LABEL[c.authorRole] ?? c.authorRole}
                  </span>
                </div>
                {c.isMine ? (
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(c.id)} disabled={isPending} aria-label="Delete comment">
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
            </li>
          ))
        )}
      </ul>

      {canComment ? (
        <div className="space-y-2">
          <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" />
          <Button onClick={post} disabled={isPending || body.trim().length === 0} className="bg-slate-800 text-white hover:bg-slate-800/90">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Comment
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-muted-foreground">
          Commenting is currently disabled.
        </p>
      )}
    </div>
  );
}
