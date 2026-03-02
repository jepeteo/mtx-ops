import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      db.client.findMany({
        where: {
          workspaceId: session.workspaceId,
          name: { contains: query, mode: "insensitive" },
        },
        select: { id: true, name: true, status: true },
        take: 25,
        orderBy: { updatedAt: "desc" },
      }),
      db.project.findMany({
        where: {
          workspaceId: session.workspaceId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { keyPrefix: { contains: query.toUpperCase(), mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, keyPrefix: true, status: true },
        take: 25,
        orderBy: { updatedAt: "desc" },
      }),
      db.task.findMany({
        where: {
          workspaceId: session.workspaceId,
          title: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          title: true,
          status: true,
          project: { select: { keyPrefix: true, name: true } },
        },
        take: 25,
        orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      }),
      db.note.findMany({
        where: {
          workspaceId: session.workspaceId,
          body: { contains: query, mode: "insensitive" },
        },
        select: { id: true, body: true, entityType: true, entityId: true, createdAt: true },
        take: 25,
        orderBy: { createdAt: "desc" },
      }),
      db.service.findMany({
        where: {
          client: {
            workspaceId: session.workspaceId,
          },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { provider: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          provider: true,
          status: true,
          clientId: true,
          client: { select: { name: true } },
        },
        take: 25,
        orderBy: { updatedAt: "desc" },
      }),
      db.assetLink.findMany({
        where: {
          client: {
            workspaceId: session.workspaceId,
          },
          OR: [
            { label: { contains: query, mode: "insensitive" } },
            { kind: { contains: query, mode: "insensitive" } },
            { url: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          label: true,
          kind: true,
          url: true,
          clientId: true,
          client: { select: { name: true } },
        },
        take: 25,
        orderBy: { updatedAt: "desc" },
      }),
    ]);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold tracking-wider text-muted-foreground">DISCOVERY</div>
        <h1 className="mt-1 text-xl font-semibold">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search clients, projects, tasks, notes, providers, and domains/links.</p>
      </div>

      <form action="/app/search" method="get" className="flex max-w-2xl gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Type at least 2 characters..."
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <button type="submit" className="rounded-md border border-border px-3 py-1 text-sm">Search</button>
      </form>

      {!enabled ? <div className="text-sm text-muted-foreground">Enter at least 2 characters to search.</div> : null}

      {enabled ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Clients ({clients.length})</CardTitle>
            </CardHeader>
            <CardContent>
            <ul className="space-y-1 text-sm">
              {clients.map((client) => (
                <li key={client.id}>
                  <Link href={`/app/clients/${client.id}`}>{client.name}</Link> <span className="text-muted-foreground">({client.status})</span>
                </li>
              ))}
              {clients.length === 0 ? <li className="text-muted-foreground">No matching clients.</li> : null}
            </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projects ({projects.length})</CardTitle>
            </CardHeader>
            <CardContent>
            <ul className="space-y-1 text-sm">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link href="/app/projects">{project.keyPrefix} · {project.name}</Link> <span className="text-muted-foreground">({project.status})</span>
                </li>
              ))}
              {projects.length === 0 ? <li className="text-muted-foreground">No matching projects.</li> : null}
            </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks ({tasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
            <ul className="space-y-1 text-sm">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link href="/app/tasks">{task.title}</Link>{" "}
                  <span className="text-muted-foreground">
                    ({task.status}{task.project ? ` · ${task.project.keyPrefix}` : ""})
                  </span>
                </li>
              ))}
              {tasks.length === 0 ? <li className="text-muted-foreground">No matching tasks.</li> : null}
            </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services / Providers ({services.length})</CardTitle>
            </CardHeader>
            <CardContent>
            <ul className="space-y-1 text-sm">
              {services.map((service) => (
                <li key={service.id}>
                  <Link href={`/app/clients/${service.clientId}`}>{service.client.name} · {service.name}</Link>{" "}
                  <span className="text-muted-foreground">({service.provider} · {service.status})</span>
                </li>
              ))}
              {services.length === 0 ? <li className="text-muted-foreground">No matching services/providers.</li> : null}
            </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Domains / Links ({assetLinks.length})</CardTitle>
            </CardHeader>
            <CardContent>
            <ul className="space-y-1 text-sm">
              {assetLinks.map((link) => (
                <li key={link.id}>
                  <Link href={`/app/clients/${link.clientId}`}>{link.client.name} · {link.label}</Link>{" "}
                  <span className="text-muted-foreground">({link.kind})</span>{" "}
                  <a href={link.url} target="_blank" rel="noreferrer" className="text-muted-foreground">↗</a>
                </li>
              ))}
              {assetLinks.length === 0 ? <li className="text-muted-foreground">No matching links/domains.</li> : null}
            </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes ({notes.length})</CardTitle>
              <CardDescription>Quick excerpts from matching client notes.</CardDescription>
            </CardHeader>
            <CardContent>
            <ul className="space-y-1 text-sm">
              {notes.map((note) => (
                <li key={note.id}>
                  <Link href={note.entityType === "Client" ? `/app/clients/${note.entityId}` : "/app/clients"}>
                    {note.body.slice(0, 120)}{note.body.length > 120 ? "…" : ""}
                  </Link> <span className="text-muted-foreground">({note.entityType})</span>
                </li>
              ))}
              {notes.length === 0 ? <li className="text-muted-foreground">No matching notes.</li> : null}
            </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
