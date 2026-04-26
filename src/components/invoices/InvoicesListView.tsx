"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { formatMinorCurrency } from "@/lib/invoices/ui";
import type { ApiEnvelope, InvoiceComputedStatus, InvoiceRecord } from "./types";

type InvoiceListPayload = { invoices: InvoiceRecord[] };

export function InvoicesListView({ defaultClientId }: { defaultClientId?: string }) {
  const [items, setItems] = useState<InvoiceRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvoiceComputedStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (defaultClientId) params.set("clientId", defaultClientId);
    if (statusFilter !== "all") params.set("status", statusFilter);
    return params.toString();
  }, [defaultClientId, statusFilter]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/invoices${query ? `?${query}` : ""}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<InvoiceListPayload> | null;
      if (!mounted) return;

      if (!response.ok || !payload || !payload.ok) {
        setError(payload && !payload.ok ? payload.error.message : "Failed to load invoices");
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(payload.data.invoices);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Invoices</CardTitle>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as InvoiceComputedStatus | "all")}
          className="form-select h-8 w-[170px] text-xs"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="void">Void</option>
        </select>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Status</th>
                <th>Issue</th>
                <th>Due</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Loading invoices...
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-medium">
                      <Link href={`/app/invoices/${invoice.id}`} className="text-primary hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td>{invoice.client?.name ?? "—"}</td>
                    <td>
                      <InvoiceStatusBadge status={invoice.computedStatus} />
                    </td>
                    <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
                    <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td>{formatMinorCurrency(invoice.totalMinor, invoice.currency)}</td>
                  </tr>
                ))}
              {!loading && items.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error ? <div className="p-4 text-xs font-medium text-destructive">{error}</div> : null}
      </CardContent>
    </Card>
  );
}
