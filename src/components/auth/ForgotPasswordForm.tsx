"use client";

import * as React from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFieldInput } from "@/components/ui/form-field";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setError(data?.error?.message ?? "Could not send reset email");
      return;
    }

    setSuccess(true);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-base">Reset password</CardTitle>
        <CardDescription>Enter your account email to receive a reset link</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="grid gap-4">
            <div
              role="status"
              className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-medium text-foreground"
            >
              Reset link sent. Check your inbox for instructions.
            </div>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={onSubmit}>
            <FormFieldInput
              id="forgot-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mtxstudio.com"
              autoComplete="email"
              autoFocus
              required
            />
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive"
              >
                {error}
              </div>
            ) : null}
            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "w-full")}>
              Back to sign in
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
