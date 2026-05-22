import { requireSession } from "@/lib/auth/guards";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AppShell role={session.role}>{children}</AppShell>;
}
