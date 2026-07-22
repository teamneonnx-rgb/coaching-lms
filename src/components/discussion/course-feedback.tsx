"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/actions/discussion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CourseFeedback({
  courseId,
  initialRating,
  initialComment,
}: {
  courseId: string;
  initialRating: number;
  initialComment: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [isPending, start] = useTransition();
  const hadFeedback = initialRating > 0;

  function submit() {
    start(async () => {
      const r = await submitFeedback({ courseId, rating, comment });
      if (r.ok) {
        toast.success(r.info ?? "Saved");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Rate this course</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              <Star
                className={`size-7 transition-colors ${
                  (hover || rating) >= n ? "fill-orange-400 text-orange-400" : "text-slate-300"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share what worked or what could improve (optional)"
        />
        <Button
          onClick={submit}
          disabled={isPending || rating < 1}
          className="bg-orange-500 text-white hover:bg-orange-500/90"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {hadFeedback ? "Update feedback" : "Submit feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}
