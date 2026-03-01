import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateServiceForm } from "@/components/clients/CreateServiceForm";
import { DeleteServiceButton } from "@/components/clients/DeleteServiceButton";
import { UpdateServiceStatusButton } from "@/components/clients/UpdateServiceStatusButton";
import { UpdateServiceReminderRules } from "@/components/clients/UpdateServiceReminderRules";
import { CreateNoteForm } from "@/components/notes/CreateNoteForm";
import { CreateDecisionForm } from "@/components/decisions/CreateDecisionForm";
import { CreateHandoverForm } from "@/components/handovers/CreateHandoverForm";
import { AckHandoverButton } from "@/components/handovers/AckHandoverButton";
import { UploadAttachmentForm } from "@/components/attachments/UploadAttachmentForm";
import { getAttachmentPublicUrl } from "@/lib/storage/s3";

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

  const notes = await db.note.findMany({
    where: {
      workspaceId: session.workspaceId,
      entityType: "Client",
      entityId: client.id,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const decisions = await db.decision.findMany({
    where: {
      workspaceId: session.workspaceId,
      entityType: "Client",
      entityId: client.id,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const handovers = await db.handover.findMany({
    where: {
      workspaceId: session.workspaceId,
      entityType: "Client",
      entityId: client.id,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const activeUsers = await db.user.findMany({
    where: {
      workspaceId: session.workspaceId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  const authorMap = new Map(activeUsers.map((user) => [user.id, user.name || user.email]));

  const attachmentLinks = await db.attachmentLink.findMany({
    where: {
      workspaceId: session.workspaceId,
      entityType: "Client",
      entityId: client.id,
    },
    include: {
      attachment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const timeline = [
    ...notes.map((note) => ({
      id: `note:${note.id}`,
      createdAt: note.createdAt,
      type: "Note" as const,
      title: "Note added",
      body: note.body,
      actorId: note.authorId,
    })),
    ...decisions.map((decision) => ({
      id: `decision:${decision.id}`,
      createdAt: decision.createdAt,
      type: "Decision" as const,
      title: decision.title,
      body: decision.body,
      actorId: decision.authorId,
    })),
    ...handovers.map((handover) => ({
      id: `handover:${handover.id}`,
      createdAt: handover.createdAt,
      type: "Handover" as const,
      title: handover.title,
      body: handover.body,
      actorId: handover.fromUserId,
      toUserId: handover.toUserId,
      status: handover.status,
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

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
      <CreateServiceForm clientId={client.id} />
      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#fafafa" }}>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Name</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Provider</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Type</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Renewal</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Reminders</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
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
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
                  {Array.isArray(s.reminderRules)
                    ? s.reminderRules
                        .map((rule) => Number(rule))
                        .filter((rule) => Number.isInteger(rule) && rule >= 0)
                        .join(", ") || "—"
                    : "—"}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{s.status}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
                  <UpdateServiceReminderRules
                    serviceId={s.id}
                    initialRules={
                      Array.isArray(s.reminderRules)
                        ? s.reminderRules
                            .map((rule) => Number(rule))
                            .filter((rule) => Number.isInteger(rule) && rule >= 0 && rule <= 365)
                        : [60, 30, 14, 7]
                    }
                  />
                  {s.status === "ACTIVE" ? (
                    <UpdateServiceStatusButton serviceId={s.id} nextStatus="CANCELED" />
                  ) : (
                    <UpdateServiceStatusButton serviceId={s.id} nextStatus="ACTIVE" />
                  )}
                  <DeleteServiceButton serviceId={s.id} />
                </td>
              </tr>
            ))}
            {client.services.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 14, color: "#666" }}>
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

      <h3>Notes</h3>
      <CreateNoteForm entityType="Client" entityId={client.id} />
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {notes.map((note) => (
          <div key={note.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              {authorMap.get(note.authorId) || "Unknown"} · {new Date(note.createdAt).toLocaleString()}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{note.body}</div>
          </div>
        ))}
        {notes.length === 0 ? <div style={{ color: "#666" }}>No notes yet.</div> : null}
      </div>

      <h3>Decisions</h3>
      <CreateDecisionForm entityType="Client" entityId={client.id} />
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {decisions.map((decision) => (
          <div key={decision.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{decision.title}</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              {authorMap.get(decision.authorId) || "Unknown"} · {new Date(decision.createdAt).toLocaleString()}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{decision.body}</div>
          </div>
        ))}
        {decisions.length === 0 ? <div style={{ color: "#666" }}>No decisions yet.</div> : null}
      </div>

      <h3>Handovers</h3>
      <CreateHandoverForm
        entityType="Client"
        entityId={client.id}
        users={activeUsers.map((user) => ({ id: user.id, label: user.name || user.email }))}
      />
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {handovers.map((handover) => (
          <div key={handover.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{handover.title}</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              From {authorMap.get(handover.fromUserId) || "Unknown"} → {authorMap.get(handover.toUserId) || "Unknown"} · {handover.status}
            </div>
            <div style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>{handover.body}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <AckHandoverButton handoverId={handover.id} disabled={handover.status === "ACKED"} />
              {handover.ackedAt ? (
                <span style={{ fontSize: 12, color: "#666" }}>
                  Acked by {handover.ackedById ? authorMap.get(handover.ackedById) || "Unknown" : "Unknown"} on {new Date(handover.ackedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {handovers.length === 0 ? <div style={{ color: "#666" }}>No handovers yet.</div> : null}
      </div>

      <h3>Client timeline</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {timeline.map((item) => (
          <div key={item.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              {item.type} · {authorMap.get(item.actorId) || "Unknown"} · {new Date(item.createdAt).toLocaleString()}
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
            {item.type === "Handover" ? (
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                To {item.toUserId ? authorMap.get(item.toUserId) || "Unknown" : "Unknown"} · {item.status}
              </div>
            ) : null}
            <div style={{ whiteSpace: "pre-wrap" }}>{item.body}</div>
          </div>
        ))}
        {timeline.length === 0 ? <div style={{ color: "#666" }}>No timeline activity yet.</div> : null}
      </div>

      <h3>Attachments</h3>
      <UploadAttachmentForm entityType="Client" entityId={client.id} />
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {attachmentLinks.map((link) => {
          const fileUrl = getAttachmentPublicUrl(link.attachment.storageKey);
          return (
            <div key={link.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 600 }}>{link.label || link.attachment.fileName}</div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                {link.attachment.fileName} · {link.attachment.mimeType} · {(link.attachment.sizeBytes / 1024).toFixed(1)} KB
              </div>
              {fileUrl ? (
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  Open attachment
                </a>
              ) : (
                <span style={{ color: "#666" }}>Storage public URL not configured</span>
              )}
            </div>
          );
        })}
        {attachmentLinks.length === 0 ? <div style={{ color: "#666" }}>No attachments yet.</div> : null}
      </div>
    </div>
  );
}
