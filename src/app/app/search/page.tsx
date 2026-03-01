import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";

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
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Search</h2>
        <p style={{ margin: 0, color: "#666" }}>Search clients, projects, tasks, notes, providers, and domains/links.</p>
      </div>

      <form action="/app/search" method="get" style={{ display: "flex", gap: 8, maxWidth: 720 }}>
        <input
          name="q"
          defaultValue={query}
          placeholder="Type at least 2 characters..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Search</button>
      </form>

      {!enabled ? <div style={{ color: "#666" }}>Enter at least 2 characters to search.</div> : null}

      {enabled ? (
        <>
          <section>
            <h3>Clients ({clients.length})</h3>
            <ul>
              {clients.map((client) => (
                <li key={client.id}>
                  <Link href={`/app/clients/${client.id}`}>{client.name}</Link> <span style={{ color: "#666" }}>({client.status})</span>
                </li>
              ))}
              {clients.length === 0 ? <li style={{ color: "#666" }}>No matching clients.</li> : null}
            </ul>
          </section>

          <section>
            <h3>Projects ({projects.length})</h3>
            <ul>
              {projects.map((project) => (
                <li key={project.id}>
                  <Link href="/app/projects">{project.keyPrefix} · {project.name}</Link> <span style={{ color: "#666" }}>({project.status})</span>
                </li>
              ))}
              {projects.length === 0 ? <li style={{ color: "#666" }}>No matching projects.</li> : null}
            </ul>
          </section>

          <section>
            <h3>Tasks ({tasks.length})</h3>
            <ul>
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link href="/app/tasks">{task.title}</Link>{" "}
                  <span style={{ color: "#666" }}>
                    ({task.status}{task.project ? ` · ${task.project.keyPrefix}` : ""})
                  </span>
                </li>
              ))}
              {tasks.length === 0 ? <li style={{ color: "#666" }}>No matching tasks.</li> : null}
            </ul>
          </section>

          <section>
            <h3>Services / Providers ({services.length})</h3>
            <ul>
              {services.map((service) => (
                <li key={service.id}>
                  <Link href={`/app/clients/${service.clientId}`}>{service.client.name} · {service.name}</Link>{" "}
                  <span style={{ color: "#666" }}>({service.provider} · {service.status})</span>
                </li>
              ))}
              {services.length === 0 ? <li style={{ color: "#666" }}>No matching services/providers.</li> : null}
            </ul>
          </section>

          <section>
            <h3>Domains / Links ({assetLinks.length})</h3>
            <ul>
              {assetLinks.map((link) => (
                <li key={link.id}>
                  <Link href={`/app/clients/${link.clientId}`}>{link.client.name} · {link.label}</Link>{" "}
                  <span style={{ color: "#666" }}>({link.kind})</span>{" "}
                  <a href={link.url} target="_blank" rel="noreferrer" style={{ color: "#666" }}>↗</a>
                </li>
              ))}
              {assetLinks.length === 0 ? <li style={{ color: "#666" }}>No matching links/domains.</li> : null}
            </ul>
          </section>

          <section>
            <h3>Notes ({notes.length})</h3>
            <ul>
              {notes.map((note) => (
                <li key={note.id}>
                  <Link href={note.entityType === "Client" ? `/app/clients/${note.entityId}` : "/app/clients"}>
                    {note.body.slice(0, 120)}{note.body.length > 120 ? "…" : ""}
                  </Link>{" "}
                  <span style={{ color: "#666" }}>({note.entityType})</span>
                </li>
              ))}
              {notes.length === 0 ? <li style={{ color: "#666" }}>No matching notes.</li> : null}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
