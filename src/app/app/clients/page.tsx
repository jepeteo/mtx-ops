import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await db.client.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>Clients</h2>
        <Link href="/app/clients/new">New client</Link>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#fafafa" }}>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Name</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
                  <Link href={`/app/clients/${c.id}`}>{c.name}</Link>
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{c.status}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
                  {new Date(c.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 14, color: "#666" }}>
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
