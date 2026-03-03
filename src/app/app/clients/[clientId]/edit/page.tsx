import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { notFound } from "next/navigation";
import { DeleteClientButton } from "@/components/clients/DeleteClientButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await requireSession();
  const routeParams = await params;
  const client = await db.client.findFirst({ where: { id: routeParams.clientId, workspaceId: session.workspaceId } });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/app/clients/${client.id}`} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to {client.name}
        </Link>
        <h1 className="text-lg font-semibold">Edit client</h1>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-sm">Client details</CardTitle>
          <CardDescription>Update information for {client.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={`/api/clients/${client.id}`} method="post" className="grid gap-4">
            <input type="hidden" name="_method" value="put" />
            <div className="form-row">
              <label className="form-label">Name</label>
              <input name="name" defaultValue={client.name} required className="form-input" />
            </div>

            <div className="form-row">
              <label className="form-label">Status</label>
              <select name="status" defaultValue={client.status} className="form-select">
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="form-row">
              <label className="form-label">Pinned notes</label>
              <textarea name="pinnedNotes" defaultValue={client.pinnedNotes ?? ""} rows={6} className="form-textarea" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="form-btn">Save changes</button>
              <Link href={`/app/clients/${client.id}`} className="form-btn-outline">Cancel</Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-xl border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">Danger zone</CardTitle>
          <CardDescription>Permanently delete this client and all associated data</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteClientButton clientId={client.id} />
        </CardContent>
      </Card>
    </div>
  );
}
