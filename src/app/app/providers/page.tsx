import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";

type Search = {
  q?: string;
};

export default async function ProvidersPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const session = await requireSession();
  const resolvedSearch = (await searchParams) ?? {};
  const query = (resolvedSearch.q ?? "").trim();

  const services = await db.service.findMany({
    where: {
      client: { workspaceId: session.workspaceId },
      ...(query
        ? {
            OR: [
              { provider: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      provider: true,
      name: true,
      status: true,
      renewalDate: true,
      clientId: true,
      client: { select: { name: true } },
    },
    orderBy: [{ provider: "asc" }, { renewalDate: "asc" }, { createdAt: "desc" }],
    take: 800,
  });

  const byProvider = new Map<
    string,
    {
      serviceCount: number;
      activeCount: number;
      unknownCount: number;
      nextRenewal: Date | null;
      clientMap: Map<string, string>;
    }
  >();

  for (const service of services) {
    const key = service.provider.trim() || "Unknown";
    const current =
      byProvider.get(key) ??
      {
        serviceCount: 0,
        activeCount: 0,
        unknownCount: 0,
        nextRenewal: null,
        clientMap: new Map<string, string>(),
      };

    current.serviceCount += 1;
    if (service.status === "ACTIVE") current.activeCount += 1;
    if (service.status === "UNKNOWN") current.unknownCount += 1;
    current.clientMap.set(service.clientId, service.client.name);

    if (service.renewalDate) {
      if (!current.nextRenewal || service.renewalDate.getTime() < current.nextRenewal.getTime()) {
        current.nextRenewal = service.renewalDate;
      }
    }

    byProvider.set(key, current);
  }

  const providers = Array.from(byProvider.entries())
    .map(([provider, stats]) => ({
      provider,
      serviceCount: stats.serviceCount,
      activeCount: stats.activeCount,
      unknownCount: stats.unknownCount,
      nextRenewal: stats.nextRenewal,
      clients: Array.from(stats.clientMap.entries()).map(([id, name]) => ({ id, name })),
    }))
    .sort((left, right) => left.provider.localeCompare(right.provider));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>Providers</h2>
        <form method="get" style={{ display: "flex", gap: 8 }}>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search provider or service"
            style={{ padding: 8, minWidth: 260 }}
          />
          <button type="submit">Search</button>
        </form>
      </div>

      <div style={{ color: "#666" }}>
        Provider catalog across all clients. Fast path to Client Cards from each provider row.
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#fafafa" }}>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Provider</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Services</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Active</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Unknown</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Next renewal</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Clients</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.provider}>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1", fontWeight: 600 }}>{provider.provider}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{provider.serviceCount}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{provider.activeCount}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{provider.unknownCount}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
                  {provider.nextRenewal ? new Date(provider.nextRenewal).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {provider.clients.slice(0, 6).map((client) => (
                      <Link key={client.id} href={`/app/clients/${client.id}`}>
                        {client.name}
                      </Link>
                    ))}
                    {provider.clients.length > 6 ? <span style={{ color: "#666" }}>+{provider.clients.length - 6} more</span> : null}
                  </div>
                </td>
              </tr>
            ))}
            {providers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 14, color: "#666" }}>
                  No providers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
