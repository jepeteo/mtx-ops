import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await db.client.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground">CRM</div>
          <h1 className="mt-1 text-xl font-semibold">Clients</h1>
        </div>
        <Link className="rounded-md border border-border px-3 py-1 text-sm" href="/app/clients/new">
          New client
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client list</CardTitle>
          <CardDescription>Most recently updated clients in this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-2">Name</th>
              <th className="py-2">Status</th>
              <th className="py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="py-2">
                  <Link href={`/app/clients/${c.id}`}>{c.name}</Link>
                </td>
                <td className="py-2">{c.status}</td>
                <td className="py-2">
                  {new Date(c.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-muted-foreground">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </CardContent>
      </Card>
    </div>
  );
}
