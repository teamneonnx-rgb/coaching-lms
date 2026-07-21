"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getSubjectiveUploadUrl, submitSubjective } from "@/lib/actions/submissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SubjectiveUpload({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const presign = await getSubjectiveUploadUrl({
        assessmentId,
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
    if (!fileKey) return;
    startTransition(async () => {
      const result = await submitSubjective({ assessmentId, fileKey });
      if (result.ok) {
        toast.success(result.info ?? "Submitted");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not submit");
      }
    });
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-slate-700">
          Upload a clear PDF or image scan of your handwritten answers.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onFile}
        />

        {fileKey ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle2 className="size-4" />
            <span className="truncate">{fileName}</span>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Choose file
          </Button>
        )}

        <Button
          type="button"
          onClick={submit}
          disabled={!fileKey || isPending}
          className="w-full bg-orange-500 text-white hover:bg-orange-500/90"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Submit for grading
        </Button>
      </CardContent>
    </Card>
  );
}
