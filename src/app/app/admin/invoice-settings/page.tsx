import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminInvoiceSettingsPage() {
  await requireRole("ADMIN");
  redirect("/app/admin/settings?tab=invoicing");
}
