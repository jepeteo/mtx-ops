import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Search = { token?: string };

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const resolved = (await searchParams) ?? {};
  const token = typeof resolved.token === "string" ? resolved.token.trim() : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-5">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-md shadow-primary/25">
          M
        </div>
        <div>
          <h1 className="text-lg font-semibold">MTX Ops</h1>
          <div className="text-xs text-muted-foreground">Operations Console</div>
        </div>
      </div>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-base">Invalid reset link</CardTitle>
            <CardDescription>Request a new password reset from the sign-in page</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/login/forgot" className={cn(buttonVariants(), "w-full")}>
              Request reset link
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "w-full")}>
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
