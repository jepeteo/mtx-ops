import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClientCardPage({ params }: { params: { clientId: string } }) {
  const session = await requireSession();
  const client = await db.client.findFirst({
    where: { id: params.clientId, workspaceId: session.workspaceId },
    include: {
      services: { orderBy: { renewalDate: "asc" } },
      assetLinks: { orderBy: { createdAt: "desc" }, take: 20 },
      vaultPointers: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!client) notFound();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>{client.name}</h2>
        <Link href={`/app/clients/${client.id}/edit`}>Edit</Link>
      </div>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Pinned notes</div>
          <div style={{ whiteSpace: "pre-wrap", color: "#555" }}>{client.pinnedNotes || "—"}</div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Quick stats</div>
          <div style={{ color: "#555" }}>
            Services: {client.services.length} • Links: {client.assetLinks.length} • Vault pointers: {client.vaultPointers.length}
          </div>
        </div>
      </section>

      <h3>Services & renewals</h3>
      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#fafafa" }}>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Name</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Provider</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Type</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Renewal</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {client.services.map((s) => (
              <tr key={s.id}>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{s.name}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{s.provider}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{s.type}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
                  {s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{s.status}</td>
              </tr>
            ))}
            {client.services.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 14, color: "#666" }}>
                  No services yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3>Assets & links</h3>
      <ul>
        {client.assetLinks.map((l) => (
          <li key={l.id}>
            <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a> <span style={{ color: "#666" }}>({l.kind})</span>
          </li>
        ))}
        {client.assetLinks.length === 0 && <li style={{ color: "#666" }}>No links yet.</li>}
      </ul>

      <h3>Credentials (Vault pointers)</h3>
      <ul>
        {client.vaultPointers.map((v) => (
          <li key={v.id}>
            {v.label} — item <code>{v.vaultItemId}</code> field <code>{v.fieldName}</code>
          </li>
        ))}
        {client.vaultPointers.length === 0 && <li style={{ color: "#666" }}>No vault pointers yet.</li>}
      </ul>
    </div>
  );
}
