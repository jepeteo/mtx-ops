"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFieldInput } from "@/components/ui/form-field";
import { safeAppRedirectPath } from "@/lib/http/safeRedirect";

export function LoginForm({
  redirectTo = "/app",
  passwordReset = false,
}: {
  redirectTo?: string;
  passwordReset?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setError(data?.error?.message ?? "Login failed");
      return;
    }

    router.push(safeAppRedirectPath(redirectTo));
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-base">Sign in</CardTitle>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {passwordReset ? (
            <div
              role="status"
              className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-medium text-foreground"
            >
              Your password was updated. Sign in with your new password.
            </div>
          ) : null}
          <FormFieldInput
            id="login-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@mtxstudio.com"
            autoComplete="email"
            autoFocus
          />
          {error ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
              {error}
            </div>
          ) : null}
          <div className="grid gap-2">
            <FormFieldInput
              id="login-password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <Link
                href="/login/forgot"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="mt-1 w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
