"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  PlayCircle,
  FileText,
  Loader2,
  Upload,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  createChapter,
  deleteChapter,
  createResource,
  deleteResource,
  getContentUploadUrl,
} from "@/lib/actions/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { EmptyState } from "@/components/empty-state";

type Resource = { id: string; title: string; type: "VIDEO" | "PDF"; duration: number | null; approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "AMENDED" };
type Chapter = { id: string; title: string; resources: Resource[] };

export function CourseContentManager({
  courseId,
  chapters,
  accent = "blue",
}: {
  courseId: string;
  chapters: Chapter[];
  accent?: "blue" | "teal";
}) {
  const accentBtn =
    accent === "teal"
      ? "bg-teal-600 hover:bg-teal-600/90"
      : "bg-blue-600 hover:bg-blue-600/90";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Course content</h2>
        <AddChapterDialog courseId={courseId} accentBtn={accentBtn} />
      </div>

      {chapters.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No chapters yet"
          description="Add a chapter, then add video or PDF resources to it."
        />
      ) : (
        <Accordion type="multiple" defaultValue={chapters.map((c) => c.id)} className="space-y-3">
          {chapters.map((ch) => (
            <AccordionItem key={ch.id} value={ch.id} className="rounded-lg border border-slate-200 px-4">
              <div className="flex items-center gap-2">
                <AccordionTrigger className="flex-1 text-sm font-medium hover:no-underline">
                  {ch.title}
                  <span className="ml-auto mr-2 text-xs font-normal text-muted-foreground">
                    {ch.resources.length} items
                  </span>
                </AccordionTrigger>
                <ConfirmDeleteDialog
                  title="Delete chapter"
                  description={`Delete "${ch.title}" and all its resources?`}
                  onConfirm={() => deleteChapter(ch.id)}
                />
              </div>
              <AccordionContent>
                <div className="space-y-2 pb-2">
                  {ch.resources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No resources yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {ch.resources.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center gap-3 rounded-md border border-slate-100 px-3 py-2"
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                            {r.type === "VIDEO" ? <PlayCircle className="size-4" /> : <FileText className="size-4" />}
                          </span>
                          <span className="flex-1 truncate text-sm text-slate-900">{r.title}</span>
                          {r.approvalStatus === "PENDING" ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Pending review</span>
                          ) : r.approvalStatus === "REJECTED" ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">Rejected</span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">{r.type}</span>
                          <ConfirmDeleteDialog
                            title="Delete resource"
                            description={`Delete "${r.title}"?`}
                            onConfirm={() => deleteResource(r.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  <AddResourceDialog chapterId={ch.id} accentBtn={accentBtn} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function AddChapterDialog({ courseId, accentBtn }: { courseId: string; accentBtn: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createChapter({ courseId, title });
      if (result.ok) {
        toast.success("Chapter added");
        setTitle("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`text-white ${accentBtn}`}>
          <Plus className="size-4" /> Add chapter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add chapter</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Chapter title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kinematics" />
          </div>
          <Button
            onClick={submit}
            disabled={isPending || title.trim().length < 2}
            className={`w-full text-white ${accentBtn}`}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Add chapter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddResourceDialog({ chapterId, accentBtn }: { chapterId: string; accentBtn: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"VIDEO" | "PDF">("VIDEO");
  const [fileKey, setFileKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const presign = await getContentUploadUrl({ chapterId, fileName: file.name, contentType: file.type });
      if (!presign.ok || !presign.url || !presign.fileKey) {
        toast.error(presign.error ?? "Upload not available — paste a URL");
        return;
      }
      const put = await fetch(presign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) {
        toast.error("Upload failed");
        return;
      }
      setFileKey(presign.fileKey);
      toast.success("Uploaded");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await createResource({ chapterId, title, type, fileKey });
      if (result.ok) {
        toast.success("Resource added");
        setTitle("");
        setFileKey("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-1">
          <Plus className="size-3.5" /> Add resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lecture 1" />
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "VIDEO" | "PDF")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>File URL or key</Label>
            <Input
              value={fileKey}
              onChange={(e) => setFileKey(e.target.value)}
              placeholder="Paste a URL (YouTube / PDF link) or upload"
            />
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept={type === "VIDEO" ? "video/*" : "application/pdf"}
              onChange={onFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload file
            </Button>
          </div>
          <Button
            onClick={submit}
            disabled={isPending || title.trim().length < 2 || fileKey.trim().length < 1}
            className={`w-full text-white ${accentBtn}`}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Add resource
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
