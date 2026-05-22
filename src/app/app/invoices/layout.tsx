import { requireRole } from "@/lib/auth/guards";

export default async function InvoicesLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return children;
}
