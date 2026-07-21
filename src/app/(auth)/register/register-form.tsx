"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { registerAction } from "@/lib/actions/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
    },
  });

  function onSubmit(values: RegisterInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await registerAction(values);
      if (result?.error) {
        setFormError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Student name" {...field} />
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
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
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
                  <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-1">
          <Separator />
          <p className="pt-2 text-xs font-medium text-muted-foreground">
            Parent / guardian contact (for attendance alerts)
          </p>
        </div>

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
                <FormDescription className="text-xs">Optional</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {formError ? (
          <p className="text-sm font-medium text-destructive">{formError}</p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 text-white hover:bg-blue-600/90"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>
    </Form>
  );
}
