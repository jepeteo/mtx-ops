import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Layers, AlertTriangle, Search as SearchIcon } from "lucide-react";

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
      ...(query ? { OR: [{ provider: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] } : {}),
    },
    select: {
      id: true, provider: true, name: true, status: true, renewalDate: true, clientId: true,
      client: { select: { name: true } },
    },
    orderBy: [{ provider: "asc" }, { renewalDate: "asc" }, { createdAt: "desc" }],
    take: 800,
  });

  const byProvider = new Map<string, { serviceCount: number; activeCount: number; unknownCount: number; nextRenewal: Date | null; clientMap: Map<string, string> }>();
  for (const s of services) {
    const key = s.provider.trim() || "Unknown";
    const current = byProvider.get(key) ?? { serviceCount: 0, activeCount: 0, unknownCount: 0, nextRenewal: null, clientMap: new Map<string, string>() };
    current.serviceCount += 1;
    if (s.status === "ACTIVE") current.activeCount += 1;
    if (s.status === "UNKNOWN") current.unknownCount += 1;
    current.clientMap.set(s.clientId, s.client.name);
    if (s.renewalDate && (!current.nextRenewal || s.renewalDate.getTime() < current.nextRenewal.getTime())) current.nextRenewal = s.renewalDate;
    byProvider.set(key, current);
  }

  const providers = Array.from(byProvider.entries())
    .map(([provider, stats]) => ({ provider, ...stats, clients: Array.from(stats.clientMap.entries()).map(([id, name]) => ({ id, name })) }))
    .sort((a, b) => a.provider.localeCompare(b.provider));

  const providerCount = providers.length;
  const totalServices = providers.reduce((sum, p) => sum + p.serviceCount, 0);
  const unknownServices = providers.reduce((sum, p) => sum + p.unknownCount, 0);

  const stats = [
    { label: "Providers", value: providerCount, icon: Globe, color: "text-primary", bg: "bg-primary/10" },
    { label: "Services", value: totalServices, icon: Layers, color: "text-info", bg: "bg-info/10" },
    { label: "Unknown status", value: unknownServices, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Providers</h1>
          <p className="text-sm text-muted-foreground">Service provider catalog across all clients</p>
        </div>
        <form method="get" className="flex gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="search" name="q" defaultValue={query} placeholder="Search provider or service" className="form-input min-w-[240px] pl-9" />
          </div>
          <button type="submit" className="form-btn">Search</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Services</th>
                  <th>Active</th>
                  <th>Unknown</th>
                  <th>Next renewal</th>
                  <th>Clients</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.provider} className="align-top">
                    <td className="font-medium">{p.provider}</td>
                    <td>{p.serviceCount}</td>
                    <td>{p.activeCount}</td>
                    <td>{p.unknownCount > 0 ? <span className="text-warning">{p.unknownCount}</span> : 0}</td>
                    <td>{p.nextRenewal ? new Date(p.nextRenewal).toLocaleDateString() : "—"}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {p.clients.slice(0, 6).map((c) => (
                          <Link key={c.id} href={`/app/clients/${c.id}`} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-primary/15 hover:text-primary">{c.name}</Link>
                        ))}
                        {p.clients.length > 6 && <span className="text-[11px] text-muted-foreground">+{p.clients.length - 6} more</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">No providers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
