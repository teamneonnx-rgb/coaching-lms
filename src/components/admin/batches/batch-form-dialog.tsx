"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createBatch, updateBatch } from "@/lib/actions/admin/batches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export type EditableBatch = {
  id: string;
  name: string;
  description: string | null;
  startDate: string; // yyyy-mm-dd
  endDate: string | null; // yyyy-mm-dd
  isActive: boolean;
};

const formSchema = z
  .object({
    name: z.string().trim().min(2, "Batch name must be at least 2 characters").max(100),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .refine(
    (v) => !v.endDate || new Date(v.endDate) >= new Date(v.startDate),
    { path: ["endDate"], message: "End date must be after start date" }
  );

type BatchFormValues = z.infer<typeof formSchema>;

export function BatchFormDialog({
  batch,
  trigger,
}: {
  batch?: EditableBatch;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: batch?.name ?? "",
      description: batch?.description ?? "",
      startDate: batch?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: batch?.endDate ?? "",
      isActive: batch?.isActive ?? true,
    },
  });

  function onSubmit(values: BatchFormValues) {
    startTransition(async () => {
      const payload = {
        name: values.name,
        description: values.description,
        startDate: values.startDate,
        endDate: values.endDate ? values.endDate : null,
        isActive: values.isActive,
      };
      const result = batch
        ? await updateBatch({ ...payload, id: batch.id })
        : await createBatch(payload);
      if (result.ok) {
        toast.success(batch ? "Batch updated" : "Batch created");
        setOpen(false);
        if (!batch) form.reset();
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
            <Plus className="size-4" /> Add batch
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{batch ? "Edit batch" : "Add batch"}</DialogTitle>
          <DialogDescription>
            Batches group students and hold their courses.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NEET 2026 Morning" {...field} />
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
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Active batch</FormLabel>
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
                disabled={isPending}
                className="bg-blue-600 text-white hover:bg-blue-600/90"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {batch ? "Save changes" : "Create batch"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
