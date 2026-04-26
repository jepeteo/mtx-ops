"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, AlertTriangle, TrendingUp, Wallet } from "lucide-react";
import type { ApiEnvelope, InvoiceRecord } from "./types";
import { formatMinorCurrency } from "@/lib/invoices/ui";
import { computeInvoiceDashboardMetrics } from "@/lib/invoices/dashboard";

export function InvoiceDashboardWidgets() {
  const [items, setItems] = useState<InvoiceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const response = await fetch("/api/invoices", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | ApiEnvelope<{ invoices: InvoiceRecord[] }>
        | null;
      if (!mounted) return;
      if (!response.ok || !payload || !payload.ok) {
        setError(payload && !payload.ok ? payload.error.message : "Failed to load invoice widgets");
        setItems([]);
        return;
      }
      setItems(payload.data.invoices);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = computeInvoiceDashboardMetrics(items);
  const currency = items[0]?.currency ?? "GBP";

  const widgets = [
    { label: "Unpaid invoices", value: metrics.unpaidCount.toString(), icon: Receipt, href: "/app/invoices?status=sent" },
    { label: "Overdue invoices", value: metrics.overdueCount.toString(), icon: AlertTriangle, href: "/app/invoices?status=overdue" },
    { label: "Revenue issued (month)", value: formatMinorCurrency(metrics.revenueIssuedMinor, currency), icon: TrendingUp, href: "/app/invoices" },
    { label: "Revenue paid (month)", value: formatMinorCurrency(metrics.revenuePaidMinor, currency), icon: Wallet, href: "/app/invoices" },
  ];

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoicing</div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.map((widget) => {
          const Icon = widget.icon;
          return (
            <Link href={widget.href} key={widget.label}>
              <Card className="transition-colors hover:border-primary/30">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{widget.value}</div>
                    <div className="text-xs text-muted-foreground">{widget.label}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </div>
  );
}
