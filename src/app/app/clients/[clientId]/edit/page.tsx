import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { notFound } from "next/navigation";

export default async function EditClientPage({ params }: { params: { clientId: string } }) {
  const session = await requireSession();
  const client = await db.client.findFirst({ where: { id: params.clientId, workspaceId: session.workspaceId } });
  if (!client) notFound();

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Edit client</h2>
      <form action={`/api/clients/${client.id}`} method="post" style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        <input type="hidden" name="_method" value="put" />
        <label>
          Name
          <input name="name" defaultValue={client.name} required style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          Status
          <select name="status" defaultValue={client.status} style={{ width: "100%", padding: 8 }}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>

        <label>
          Pinned notes
          <textarea name="pinnedNotes" defaultValue={client.pinnedNotes ?? ""} rows={6} style={{ width: "100%", padding: 8 }} />
        </label>

        <button type="submit">Save</button>
      </form>
    </div>
  );
}
