"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { createUser, updateUser } from "@/lib/actions/admin/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
};

// Client validation. Password rules depend on mode (required on create).
function makeSchema(mode: "create" | "edit") {
  return z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
      email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
      password:
        mode === "create"
          ? z.string().min(8, "Password must be at least 8 characters").max(72)
          : z.string().max(72).optional().or(z.literal("")),
      role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
      parentName: z.string().trim().max(100).optional().or(z.literal("")),
      parentPhone: z.string().trim().max(20).optional().or(z.literal("")),
      parentEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
    })
    .refine(
      (val) => val.role !== "STUDENT" || !!val.parentPhone || !!val.parentEmail,
      {
        path: ["parentPhone"],
        message: "Students need a parent phone or email for alerts",
      }
    );
}

type UserFormValues = z.infer<ReturnType<typeof makeSchema>>;

export function UserFormDialog({
  user,
  trigger,
}: {
  user?: EditableUser;
  trigger?: React.ReactNode;
}) {
  const mode = user ? "edit" : "create";
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(makeSchema(mode)),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "STUDENT",
      parentName: user?.parentName ?? "",
      parentPhone: user?.parentPhone ?? "",
      parentEmail: user?.parentEmail ?? "",
    },
  });

  const role = form.watch("role");

  function onSubmit(values: UserFormValues) {
    startTransition(async () => {
      const result = user
        ? await updateUser({ ...values, id: user.id })
        : await createUser(values);
      if (result.ok) {
        toast.success(user ? "User updated" : "User created");
        setOpen(false);
        if (!user) form.reset();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !user) form.reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-blue-600 text-white hover:bg-blue-600/90">
            <Plus className="size-4" /> Add user
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {user ? "Update the account details." : "Create a new admin, teacher, or student."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={user ? "Leave blank to keep" : "••••••••"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {role === "STUDENT" ? (
              <div className="space-y-4 rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Parent / guardian (attendance alerts)
                </p>
                <FormField
                  control={form.control}
                  name="parentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent name</FormLabel>
                      <FormControl>
                        <Input placeholder="Parent / guardian name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="parentPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+91 90000 00000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parentEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormDescription className="text-xs">
                  Provide at least a phone or email.
                </FormDescription>
              </div>
            ) : null}

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
                {user ? "Save changes" : "Create user"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
