"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createCourse, updateCourse } from "@/lib/actions/admin/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export type Option = { id: string; label: string };
export type EditableCourse = {
  id: string;
  title: string;
  description: string | null;
  batchId: string;
  teacherId: string;
};

const formSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  batchId: z.string().min(1, "Select a batch"),
  teacherId: z.string().min(1, "Select a teacher"),
});

type CourseFormValues = z.infer<typeof formSchema>;

export function CourseFormDialog({
  course,
  batches,
  teachers,
  trigger,
}: {
  course?: EditableCourse;
  batches: Option[];
  teachers: Option[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const noRefs = batches.length === 0 || teachers.length === 0;

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: course?.title ?? "",
      description: course?.description ?? "",
      batchId: course?.batchId ?? "",
      teacherId: course?.teacherId ?? "",
    },
  });

  function onSubmit(values: CourseFormValues) {
    startTransition(async () => {
      const result = course
        ? await updateCourse({ ...values, id: course.id })
        : await createCourse(values);
      if (result.ok) {
        toast.success(course ? "Course updated" : "Course created");
        setOpen(false);
        if (!course) form.reset();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-blue-600 text-white hover:bg-blue-600/90">
            <Plus className="size-4" /> Add course
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{course ? "Edit course" : "Add course"}</DialogTitle>
          <DialogDescription>
            Assign the course to a batch and an owning teacher.
          </DialogDescription>
        </DialogHeader>

        {noRefs ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            You need at least one batch and one teacher before creating a course.
          </p>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Organic Chemistry" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="batchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a batch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {batches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || noRefs}
                className="bg-blue-600 text-white hover:bg-blue-600/90"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {course ? "Save changes" : "Create course"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
