import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateServiceForm } from "@/components/clients/CreateServiceForm";
import { DeleteServiceButton } from "@/components/clients/DeleteServiceButton";
import { UpdateServiceStatusButton } from "@/components/clients/UpdateServiceStatusButton";
import { UpdateServiceReminderRules } from "@/components/clients/UpdateServiceReminderRules";
import { CreateVaultPointerForm } from "@/components/clients/CreateVaultPointerForm";
import { VaultPointerActions } from "@/components/clients/VaultPointerActions";
import { CreateNoteForm } from "@/components/notes/CreateNoteForm";
import { CreateDecisionForm } from "@/components/decisions/CreateDecisionForm";
import { CreateHandoverForm } from "@/components/handovers/CreateHandoverForm";
import { AckHandoverButton } from "@/components/handovers/AckHandoverButton";
import { CreateAssetLinkForm } from "@/components/clients/CreateAssetLinkForm";
import { DeleteAssetLinkButton } from "@/components/clients/DeleteAssetLinkButton";
import { UploadAttachmentForm } from "@/components/attachments/UploadAttachmentForm";
import { AttachmentLinkActions } from "@/components/attachments/AttachmentLinkActions";
import { getAttachmentPublicUrl } from "@/lib/storage/s3";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { ArrowLeft, Pencil, ExternalLink, Pin, BarChart3, FileText, Lightbulb, ArrowRightLeft, Clock, Paperclip, ShieldCheck, Link2 } from "lucide-react";

type Search = {
  timelineType?: string;
  timelineLimit?: string;
};

export default async function ClientCardPage({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams?: Promise<Search> }) {
  const session = await requireSession();
  const routeParams = await params;
  const resolvedSearch = (await searchParams) ?? {};
  const canManageAttachments = session.role === "OWNER" || session.role === "ADMIN";
  const client = await db.client.findFirst({
    where: { id: routeParams.clientId, workspaceId: session.workspaceId },
    include: {
      services: { orderBy: { renewalDate: "asc" } },
      assetLinks: { orderBy: { createdAt: "desc" }, take: 20 },
      vaultPointers: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!client) notFound();
  const clientId = client.id;

  const notes = await db.note.findMany({
    where: { workspaceId: session.workspaceId, entityType: "Client", entityId: client.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const decisions = await db.decision.findMany({
    where: { workspaceId: session.workspaceId, entityType: "Client", entityId: client.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const handovers = await db.handover.findMany({
    where: { workspaceId: session.workspaceId, entityType: "Client", entityId: client.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const activeUsers = await db.user.findMany({
    where: { workspaceId: session.workspaceId, status: "ACTIVE" },
    select: { id: true, name: true, email: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  const authorMap = new Map(activeUsers.map((user) => [user.id, user.name || user.email]));

  const attachmentLinks = await db.attachmentLink.findMany({
    where: { workspaceId: session.workspaceId, entityType: "Client", entityId: client.id },
    include: { attachment: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const timeline = [
    ...notes.map((note) => ({ id: `note:${note.id}`, createdAt: note.createdAt, type: "Note" as const, title: "Note added", body: note.body, actorId: note.authorId })),
    ...decisions.map((d) => ({ id: `decision:${d.id}`, createdAt: d.createdAt, type: "Decision" as const, title: d.title, body: d.body, actorId: d.authorId })),
    ...handovers.map((h) => ({ id: `handover:${h.id}`, createdAt: h.createdAt, type: "Handover" as const, title: h.title, body: h.body, actorId: h.fromUserId, toUserId: h.toUserId, status: h.status })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const selectedTimelineType = ["all", "note", "decision", "handover"].includes(resolvedSearch.timelineType ?? "")
    ? (resolvedSearch.timelineType as "all" | "note" | "decision" | "handover")
    : "all";
  const selectedTimelineLimit = [20, 50, 100].includes(Number(resolvedSearch.timelineLimit ?? "")) ? Number(resolvedSearch.timelineLimit) : 20;

  const filteredTimeline = timeline.filter((item) => {
    if (selectedTimelineType === "all") return true;
    if (selectedTimelineType === "note") return item.type === "Note";
    if (selectedTimelineType === "decision") return item.type === "Decision";
    if (selectedTimelineType === "handover") return item.type === "Handover";
    return true;
  });
  const visibleTimeline = filteredTimeline.slice(0, selectedTimelineLimit);

  const now = Date.now();
  const renewalDue30Count = client.services.filter((s) => s.status === "ACTIVE" && s.renewalDate && (new Date(s.renewalDate).getTime() - now) / 864e5 >= 0 && (new Date(s.renewalDate).getTime() - now) / 864e5 <= 30).length;
  const renewalOverdueCount = client.services.filter((s) => s.status === "ACTIVE" && s.renewalDate && (new Date(s.renewalDate).getTime() - now) / 864e5 < 0).length;
  const unknownServiceCount = client.services.filter((s) => s.status === "UNKNOWN").length;

  function timelineHref(type: string, limit: number) {
    const p = new URLSearchParams();
    p.set("timelineType", type);
    p.set("timelineLimit", String(limit));
    return `/app/clients/${clientId}?${p.toString()}`;
  }

  const typeLabel = (t: string) => {
    const colours: Record<string, string> = { Note: "bg-info/15 text-info", Decision: "bg-warning/15 text-warning", Handover: "bg-purple-500/15 text-purple-400" };
    return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colours[t] ?? "bg-secondary text-muted-foreground"}`}>{t}</span>;
  };

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/app/clients" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Clients
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">{client.name}</h1>
            <StatusPill status={client.status} />
          </div>
        </div>
        <Link
          href={`/app/clients/${client.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
        >
          <Pencil className="h-3 w-3" /> Edit
        </Link>
      </div>

      {/* Summary cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold">{client.services.length}</div>
                <div className="text-[11px] text-muted-foreground">Services</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <div className="text-lg font-bold">{renewalDue30Count}</div>
                <div className="text-[11px] text-muted-foreground">Due in 30d</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Clock className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <div className="text-lg font-bold">{renewalOverdueCount}</div>
                <div className="text-[11px] text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-lg font-bold">{client.assetLinks.length + client.vaultPointers.length}</div>
                <div className="text-[11px] text-muted-foreground">Links & Vault</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pinned notes */}
      {client.pinnedNotes && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 pb-2">
            <Pin className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Pinned notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{client.pinnedNotes}</div>
          </CardContent>
        </Card>
      )}

      {/* Services & renewals */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-muted-foreground" /> Services &amp; renewals</h2>
        <CreateServiceForm clientId={client.id} />
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Provider</th>
                    <th>Type</th>
                    <th>Renewal</th>
                    <th>Reminders</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {client.services.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.name}</td>
                      <td>{s.provider}</td>
                      <td>{s.type}</td>
                      <td>{s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : "—"}</td>
                      <td className="text-muted-foreground">
                        {Array.isArray(s.reminderRules)
                          ? s.reminderRules.map((r) => Number(r)).filter((r) => Number.isInteger(r) && r >= 0).join(", ") || "—"
                          : "—"}
                      </td>
                      <td><StatusPill status={s.status} /></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <UpdateServiceReminderRules
                            serviceId={s.id}
                            initialRules={Array.isArray(s.reminderRules) ? s.reminderRules.map((r) => Number(r)).filter((r) => Number.isInteger(r) && r >= 0 && r <= 365) : [60, 30, 14, 7]}
                          />
                          {s.status === "ACTIVE" ? <UpdateServiceStatusButton serviceId={s.id} nextStatus="CANCELED" /> : <UpdateServiceStatusButton serviceId={s.id} nextStatus="ACTIVE" />}
                          <DeleteServiceButton serviceId={s.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {client.services.length === 0 && (
                    <tr><td colSpan={7} className="empty-state">No services yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Assets & links */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-muted-foreground" /> Assets &amp; links</h2>
        <CreateAssetLinkForm clientId={client.id} />
        <Card>
          <CardContent className="p-4">
            {client.assetLinks.length > 0 ? (
              <ul className="grid gap-2">
                {client.assetLinks.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={l.url} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">{l.label}</a>
                      <span className="text-[11px] text-muted-foreground">({l.kind})</span>
                    </div>
                    <DeleteAssetLinkButton linkId={l.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state text-center">No links yet.</div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Vault pointers */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-muted-foreground" /> Credentials (Vault pointers)</h2>
        <CreateVaultPointerForm clientId={client.id} />
        <div className="grid gap-2">
          {client.vaultPointers.map((pointer) => (
            <VaultPointerActions
              key={pointer.id}
              clientId={client.id}
              pointer={{ id: pointer.id, label: pointer.label, vaultItemId: pointer.vaultItemId, fieldName: pointer.fieldName, usernameHint: pointer.usernameHint ?? null }}
            />
          ))}
          {client.vaultPointers.length === 0 && <Card><CardContent className="p-4"><div className="empty-state text-center">No vault pointers yet.</div></CardContent></Card>}
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-muted-foreground" /> Notes</h2>
        <CreateNoteForm entityType="Client" entityId={client.id} />
        <div className="grid gap-2">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="mb-2 text-[11px] text-muted-foreground">{authorMap.get(note.authorId) || "Unknown"} · {new Date(note.createdAt).toLocaleString()}</div>
                <div className="whitespace-pre-wrap text-sm">{note.body}</div>
              </CardContent>
            </Card>
          ))}
          {notes.length === 0 && <Card><CardContent className="p-4"><div className="empty-state text-center">No notes yet.</div></CardContent></Card>}
        </div>
      </section>

      {/* Decisions */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4 text-muted-foreground" /> Decisions</h2>
        <CreateDecisionForm entityType="Client" entityId={client.id} />
        <div className="grid gap-2">
          {decisions.map((decision) => (
            <Card key={decision.id}>
              <CardContent className="p-4">
                <div className="mb-1 text-sm font-semibold">{decision.title}</div>
                <div className="mb-2 text-[11px] text-muted-foreground">{authorMap.get(decision.authorId) || "Unknown"} · {new Date(decision.createdAt).toLocaleString()}</div>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">{decision.body}</div>
              </CardContent>
            </Card>
          ))}
          {decisions.length === 0 && <Card><CardContent className="p-4"><div className="empty-state text-center">No decisions yet.</div></CardContent></Card>}
        </div>
      </section>

      {/* Handovers */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><ArrowRightLeft className="h-4 w-4 text-muted-foreground" /> Handovers</h2>
        <CreateHandoverForm
          entityType="Client"
          entityId={client.id}
          users={activeUsers.map((user) => ({ id: user.id, label: user.name || user.email }))}
        />
        <div className="grid gap-2">
          {handovers.map((handover) => (
            <Card key={handover.id}>
              <CardContent className="p-4">
                <div className="mb-1 text-sm font-semibold">{handover.title}</div>
                <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{authorMap.get(handover.fromUserId) || "Unknown"} → {authorMap.get(handover.toUserId) || "Unknown"}</span>
                  <StatusPill status={handover.status} />
                </div>
                <div className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">{handover.body}</div>
                <div className="flex items-center gap-2">
                  <AckHandoverButton handoverId={handover.id} disabled={handover.status === "ACKED"} />
                  {handover.ackedAt && (
                    <span className="text-[11px] text-muted-foreground">
                      Acked by {handover.ackedById ? authorMap.get(handover.ackedById) || "Unknown" : "Unknown"} on {new Date(handover.ackedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {handovers.length === 0 && <Card><CardContent className="p-4"><div className="empty-state text-center">No handovers yet.</div></CardContent></Card>}
        </div>
      </section>

      {/* Client timeline */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-muted-foreground" /> Client timeline</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="tab-bar">
            {(["all", "note", "decision", "handover"] as const).map((t) => (
              <Link
                key={t}
                href={timelineHref(t, selectedTimelineLimit)}
                className={selectedTimelineType === t ? "active" : ""}
              >
                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Show:
            {[20, 50, 100].map((n) => (
              <Link
                key={n}
                href={timelineHref(selectedTimelineType, n)}
                className={`rounded px-1.5 py-0.5 transition-colors ${selectedTimelineLimit === n ? "bg-primary/15 font-medium text-primary" : "hover:bg-secondary"}`}
              >
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          {visibleTimeline.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  {typeLabel(item.type)}
                  <span className="text-[11px] text-muted-foreground">{authorMap.get(item.actorId) || "Unknown"} · {new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <div className="mb-1 text-sm font-semibold">{item.title}</div>
                {item.type === "Handover" && (
                  <div className="mb-1 text-[11px] text-muted-foreground">
                    To {item.toUserId ? authorMap.get(item.toUserId) || "Unknown" : "Unknown"} · {item.status}
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</div>
              </CardContent>
            </Card>
          ))}
          {visibleTimeline.length === 0 && <Card><CardContent className="p-4"><div className="empty-state text-center">No timeline activity yet.</div></CardContent></Card>}
          {filteredTimeline.length > visibleTimeline.length && (
            <div className="text-center text-xs text-muted-foreground">Showing {visibleTimeline.length} of {filteredTimeline.length} timeline events.</div>
          )}
        </div>
      </section>

      {/* Attachments */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4 text-muted-foreground" /> Attachments</h2>
        {canManageAttachments ? (
          <UploadAttachmentForm entityType="Client" entityId={client.id} />
        ) : (
          <div className="text-xs text-muted-foreground">Only Admin/Owner roles can upload and link attachments.</div>
        )}
        <div className="grid gap-2">
          {attachmentLinks.map((link) => {
            const fileUrl = getAttachmentPublicUrl(link.attachment.storageKey);
            return (
              <Card key={link.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium">{link.label || link.attachment.fileName}</div>
                      <div className="text-[11px] text-muted-foreground">{link.attachment.fileName} · {link.attachment.mimeType} · {(link.attachment.sizeBytes / 1024).toFixed(1)} KB</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageAttachments && <AttachmentLinkActions linkId={link.id} />}
                      {fileUrl ? (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">Open</a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No public URL</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {attachmentLinks.length === 0 && <Card><CardContent className="p-4"><div className="empty-state text-center">No attachments yet.</div></CardContent></Card>}
        </div>
      </section>
    </div>
  );
}
