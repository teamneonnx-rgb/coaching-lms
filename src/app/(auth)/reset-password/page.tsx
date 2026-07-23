import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string; token?: string }>;
}) {
  const sp = await searchParams;
  const valid = !!sp.uid && !!sp.token;

  return (
    <Card className="w-full max-w-sm border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {valid ? (
          <ResetPasswordForm uid={sp.uid!} token={sp.token!} />
        ) : (
          <p className="text-sm text-destructive">This reset link is missing or malformed. Request a new one.</p>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:underline">Back to sign in</Link>
      </CardFooter>
    </Card>
  );
}
