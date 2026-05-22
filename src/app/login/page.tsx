import { LoginForm } from "@/components/auth/LoginForm";
import { safeAppRedirectPath } from "@/lib/http/safeRedirect";

type Search = { next?: string };

export default async function LoginPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const resolved = (await searchParams) ?? {};
  const redirectTo = safeAppRedirectPath(resolved.next);
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
      <LoginForm redirectTo={redirectTo} />
      <div className="mt-6 text-[11px] text-muted-foreground/60">&copy; {new Date().getFullYear()} MTX Studio</div>
    </div>
  );
}
