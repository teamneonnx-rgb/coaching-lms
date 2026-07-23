"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, Send } from "lucide-react";
import { toast } from "sonner";
import { submitMonthlyFeedback } from "@/lib/actions/parent-feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// FR-PA-01: once per calendar month per ward (server-enforced).
export function MonthlyFeedbackForm({ wardId, alreadySubmitted }: { wardId: string; alreadySubmitted: boolean }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comments, setComments] = useState("");

  if (alreadySubmitted) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-muted-foreground">
        Monthly feedback submitted — thank you. You can submit again next month.
      </p>
    );
  }

  function submit() {
    start(async () => {
      const r = await submitMonthlyFeedback({ wardId, rating, comments });
      if (r.ok) {
        toast.success(r.info ?? "Submitted");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium text-muted-foreground">Monthly feedback (teacher &amp; course)</p>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} className="p-0.5" aria-label={`${n} star`}>
            <Star className={`size-6 transition-colors ${(hover || rating) >= n ? "fill-orange-400 text-orange-400" : "text-slate-300"}`} />
          </button>
        ))}
      </div>
      <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="How is the teacher and course working for your child? (optional)" />
      <Button size="sm" onClick={submit} disabled={isPending || rating < 1} className="bg-blue-600 text-white hover:bg-blue-600/90">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit
      </Button>
    </div>
  );
}
