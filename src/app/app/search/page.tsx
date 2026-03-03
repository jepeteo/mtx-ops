import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Search as SearchIcon, ExternalLink } from "lucide-react";

type Search = {
  q?: string;
};

export default async function SearchPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const session = await requireSession();
  const resolved = (await searchParams) ?? {};
  const query = (resolved.q || "").trim();
  const enabled = query.length >= 2;

  let clients: Array<{ id: string; name: string; status: string }> = [];
  let projects: Array<{ id: string; name: string; keyPrefix: string; status: string }> = [];
  let tasks: Array<{ id: string; title: string; status: string; project: { keyPrefix: string; name: string } | null }> = [];
  let notes: Array<{ id: string; body: string; entityType: string; entityId: string; createdAt: Date }> = [];
  let services: Array<{ id: string; name: string; provider: string; status: string; clientId: string; client: { name: string } }> = [];
  let assetLinks: Array<{ id: string; label: string; kind: string; url: string; clientId: string; client: { name: string } }> = [];

  if (enabled) {
    [clients, projects, tasks, notes, services, assetLinks] = await Promise.all([
      db.client.findMany({ where: { workspaceId: session.workspaceId, name: { contains: query, mode: "insensitive" } }, select: { id: true, name: true, status: true }, take: 25, orderBy: { updatedAt: "desc" } }),
      db.project.findMany({ where: { workspaceId: session.workspaceId, OR: [{ name: { contains: query, mode: "insensitive" } }, { keyPrefix: { contains: query.toUpperCase(), mode: "insensitive" } }] }, select: { id: true, name: true, keyPrefix: true, status: true }, take: 25, orderBy: { updatedAt: "desc" } }),
      db.task.findMany({ where: { workspaceId: session.workspaceId, title: { contains: query, mode: "insensitive" } }, select: { id: true, title: true, status: true, project: { select: { keyPrefix: true, name: true } } }, take: 25, orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }] }),
      db.note.findMany({ where: { workspaceId: session.workspaceId, body: { contains: query, mode: "insensitive" } }, select: { id: true, body: true, entityType: true, entityId: true, createdAt: true }, take: 25, orderBy: { createdAt: "desc" } }),
      db.service.findMany({ where: { client: { workspaceId: session.workspaceId }, OR: [{ name: { contains: query, mode: "insensitive" } }, { provider: { contains: query, mode: "insensitive" } }] }, select: { id: true, name: true, provider: true, status: true, clientId: true, client: { select: { name: true } } }, take: 25, orderBy: { updatedAt: "desc" } }),
      db.assetLink.findMany({ where: { client: { workspaceId: session.workspaceId }, OR: [{ label: { contains: query, mode: "insensitive" } }, { kind: { contains: query, mode: "insensitive" } }, { url: { contains: query, mode: "insensitive" } }] }, select: { id: true, label: true, kind: true, url: true, clientId: true, client: { select: { name: true } } }, take: 25, orderBy: { updatedAt: "desc" } }),
    ]);
  }

  const totalResults = clients.length + projects.length + tasks.length + notes.length + services.length + assetLinks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Search</h1>
        <p className="text-sm text-muted-foreground">Search clients, projects, tasks, notes, providers, and domains/links</p>
      </div>

      <form action="/app/search" method="get" className="flex max-w-2xl gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Type at least 2 characters..."
            className="form-input pl-9"
          />
        </div>
        <button type="submit" className="form-btn">Search</button>
      </form>

      {!enabled && <div className="text-sm text-muted-foreground">Enter at least 2 characters to search.</div>}

      {enabled && (
        <>
          <div className="text-xs text-muted-foreground">{totalResults} results for &ldquo;{query}&rdquo;</div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Clients ({clients.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {clients.length > 0 ? (
                  <ul className="grid gap-1.5">
                    {clients.map((c) => (
                      <li key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                        <Link href={`/app/clients/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                        <StatusPill status={c.status} />
                      </li>
                    ))}
                  </ul>
                ) : <div className="empty-state">No matching clients.</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Projects ({projects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length > 0 ? (
                  <ul className="grid gap-1.5">
                    {projects.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                        <Link href="/app/projects" className="hover:text-primary"><code className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{p.keyPrefix}</code> {p.name}</Link>
                        <StatusPill status={p.status} />
                      </li>
                    ))}
                  </ul>
                ) : <div className="empty-state">No matching projects.</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tasks ({tasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <ul className="grid gap-1.5">
                    {tasks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                        <Link href="/app/tasks" className="hover:text-primary">{t.title}</Link>
                        <StatusPill status={t.status} />
                      </li>
                    ))}
                  </ul>
                ) : <div className="empty-state">No matching tasks.</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Services / Providers ({services.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <ul className="grid gap-1.5">
                    {services.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                        <Link href={`/app/clients/${s.clientId}`} className="hover:text-primary">{s.client.name} · {s.name}</Link>
                        <span className="text-[11px] text-muted-foreground">{s.provider}</span>
                      </li>
                    ))}
                  </ul>
                ) : <div className="empty-state">No matching services.</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Domains / Links ({assetLinks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {assetLinks.length > 0 ? (
                  <ul className="grid gap-1.5">
                    {assetLinks.map((l) => (
                      <li key={l.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                        <Link href={`/app/clients/${l.clientId}`} className="hover:text-primary">{l.client.name} · {l.label}</Link>
                        <a href={l.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </li>
                    ))}
                  </ul>
                ) : <div className="empty-state">No matching links.</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes ({notes.length})</CardTitle>
                <CardDescription>Quick excerpts from matching notes</CardDescription>
              </CardHeader>
              <CardContent>
                {notes.length > 0 ? (
                  <ul className="grid gap-1.5">
                    {notes.map((n) => (
                      <li key={n.id} className="rounded-md border border-border px-3 py-2 text-sm">
                        <Link href={n.entityType === "Client" ? `/app/clients/${n.entityId}` : "/app/clients"} className="hover:text-primary">
                          {n.body.slice(0, 120)}{n.body.length > 120 ? "\u2026" : ""}
                        </Link>
                        <span className="ml-2 text-[11px] text-muted-foreground">({n.entityType})</span>
                      </li>
                    ))}
                  </ul>
                ) : <div className="empty-state">No matching notes.</div>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
