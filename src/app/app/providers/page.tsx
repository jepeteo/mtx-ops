import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  const providerCount = providers.length;
  const totalServices = providers.reduce((sum, item) => sum + item.serviceCount, 0);
  const unknownServices = providers.reduce((sum, item) => sum + item.unknownCount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground">CATALOG</div>
          <h1 className="mt-1 text-xl font-semibold">Providers</h1>
        </div>
        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search provider or service"
            className="h-9 min-w-[240px] rounded-md border border-input bg-background px-3 text-sm"
          />
          <button type="submit" className="rounded-md border border-border px-3 py-1 text-sm">Search</button>
        </form>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Providers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{providerCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalServices}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unknown status</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{unknownServices}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider catalog</CardTitle>
          <CardDescription>Fast path to Client Cards from each provider row.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-2">Provider</th>
              <th className="py-2">Services</th>
              <th className="py-2">Active</th>
              <th className="py-2">Unknown</th>
              <th className="py-2">Next renewal</th>
              <th className="py-2">Clients</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.provider} className="border-t border-border align-top">
                <td className="py-2 font-medium">{provider.provider}</td>
                <td className="py-2">{provider.serviceCount}</td>
                <td className="py-2">{provider.activeCount}</td>
                <td className="py-2">{provider.unknownCount}</td>
                <td className="py-2">
                  {provider.nextRenewal ? new Date(provider.nextRenewal).toLocaleDateString() : "—"}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    {provider.clients.slice(0, 6).map((client) => (
                      <Link key={client.id} href={`/app/clients/${client.id}`}>
                        {client.name}
                      </Link>
                    ))}
                    {provider.clients.length > 6 ? <span className="text-muted-foreground">+{provider.clients.length - 6} more</span> : null}
                  </div>
                </td>
              </tr>
            ))}
            {providers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-muted-foreground">
                  No providers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </CardContent>
      </Card>
    </div>
  );
}
