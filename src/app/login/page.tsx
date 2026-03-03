import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-5">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-md shadow-primary/25">
          M
        </div>
        <div>
          <div className="text-lg font-semibold">MTX Ops</div>
          <div className="text-xs text-muted-foreground">Operations Console</div>
        </div>
      </div>
      <LoginForm />
      <div className="mt-6 text-[11px] text-muted-foreground/60">&copy; {new Date().getFullYear()} MTX Studio</div>
    </div>
  );
}
