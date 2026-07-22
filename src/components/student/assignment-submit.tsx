"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getAssignmentUploadUrl, submitAssignment } from "@/lib/actions/assignment-submissions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function AssignmentSubmit({
  assignmentId,
  submissionType,
  defaultText,
  hasExisting,
}: {
  assignmentId: string;
  submissionType: "FILE" | "TEXT" | "BOTH";
  defaultText: string;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [text, setText] = useState(defaultText);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const showText = submissionType !== "FILE";
  const showFile = submissionType !== "TEXT";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const presign = await getAssignmentUploadUrl({
        assignmentId,
        fileName: file.name,
        contentType: file.type,
      });
      if (!presign.ok || !presign.url || !presign.fileKey) {
        toast.error(presign.error ?? "Upload not available");
        return;
      }
      const put = await fetch(presign.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        toast.error("Upload failed");
        return;
      }
      setFileKey(presign.fileKey);
      setFileName(file.name);
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await submitAssignment({
        assignmentId,
        text: showText ? text : "",
        fileKey: fileKey ?? "",
      });
      if (result.ok) {
        toast.success(result.info ?? "Submitted");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not submit");
      }
    });
  }

  const canSubmit = (showText && text.trim().length > 0) || Boolean(fileKey);

  return (
    <div className="space-y-4">
      {showText ? (
        <div className="grid gap-1.5">
          <Label>Your answer</Label>
          <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer here…" />
        </div>
      ) : null}

      {showFile ? (
        <div className="grid gap-1.5">
          <Label>Attachment{showText ? " (optional)" : ""}</Label>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,.doc,.docx"
            className="hidden"
            onChange={onFile}
          />
          {fileKey ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="size-4" />
              <span className="truncate">{fileName}</span>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} className="w-fit">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Choose file
            </Button>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={submit}
        disabled={!canSubmit || isPending}
        className="w-full bg-orange-500 text-white hover:bg-orange-500/90"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {hasExisting ? "Resubmit" : "Submit"}
      </Button>
    </div>
  );
}
