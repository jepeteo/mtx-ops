import type { ReactNode } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { buildWeeklyDigest } from "@/lib/digest/weeklyDigest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendWeeklyDigestButton } from "@/components/digest/SendWeeklyDigestButton";
import { formatMinorCurrency } from "@/lib/invoices/ui";
import { hasMinRole } from "@/lib/auth/roles";

export default async function WeeklyDigestPage() {
  const session = await requireSession();
  const digest = await buildWeeklyDigest(session.workspaceId);
  const canEmail = hasMinRole(session.role, "ADMIN");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Weekly ops digest</h1>
          <p className="text-sm text-muted-foreground">
            Read-only summary for the week ending {digest.periodEnd.slice(0, 10)}
          </p>
        </div>
        {canEmail ? <SendWeeklyDigestButton /> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DigestCard title={`Renewals (7d) — ${digest.renewalsNext7Days.length}`}>
          {digest.renewalsNext7Days.map((r) => (
            <DigestRow
              key={r.id}
              href={`/app/clients/${r.clientId}`}
              label={`${r.clientName} · ${r.name} (${r.provider})`}
              meta={r.renewalDate.slice(0, 10)}
            />
          ))}
        </DigestCard>
        <DigestCard title={`Overdue invoices — ${digest.overdueSentInvoices.length}`}>
          {digest.overdueSentInvoices.map((i) => (
            <DigestRow
              key={i.id}
              href={`/app/invoices/${i.id}`}
              label={`${i.clientName} · ${i.invoiceNumber}`}
              meta={`${i.overdueDays}d · ${formatMinorCurrency(i.totalMinor, i.currency)}`}
            />
          ))}
        </DigestCard>
        <DigestCard title={`Open handovers — ${digest.unacknowledgedHandovers.length}`}>
          {digest.unacknowledgedHandovers.map((h) => (
            <DigestRow key={h.id} href={`/app/clients/${h.clientId}`} label={`${h.clientName} · ${h.title}`} />
          ))}
        </DigestCard>
        <DigestCard title={`Tasks due (7d) — ${digest.tasksDueNext7Days.length}`}>
          {digest.tasksDueNext7Days.map((t) => (
            <DigestRow
              key={t.id}
              href="/app/tasks"
              label={`${t.clientName ? `${t.clientName} · ` : ""}${t.title}`}
              meta={t.dueAt.slice(0, 10)}
            />
          ))}
        </DigestCard>
        <DigestCard title={`Inactive clients — ${digest.inactiveClients.length}`} className="md:col-span-2">
          {digest.inactiveClients.map((c) => (
            <DigestRow
              key={c.id}
              href={`/app/clients/${c.id}`}
              label={c.name}
              meta={`${c.inactiveDays}d inactive`}
            />
          ))}
        </DigestCard>
      </div>
    </div>
  );
}

function DigestCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {Array.isArray(children) && children.length === 0 ? (
          <div className="text-muted-foreground">None</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function DigestRow({ href, label, meta }: { href: string; label: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 py-1.5 last:border-0">
      <Link href={href} className="font-medium hover:text-primary">
        {label}
      </Link>
      {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
    </div>
  );
}
