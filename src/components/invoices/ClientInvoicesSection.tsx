"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateInvoiceDraftForm } from "./CreateInvoiceDraftForm";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import type { ApiEnvelope, InvoiceRecord } from "./types";
import { formatMinorCurrency } from "@/lib/invoices/ui";

type ClientOption = { id: string; name: string };

export function ClientInvoicesSection({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [items, setItems] = useState<InvoiceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/invoices?clientId=${clientId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<{ invoices: InvoiceRecord[] }>
      | null;
    if (!response.ok || !payload || !payload.ok) {
      setError(payload && !payload.ok ? payload.error.message : "Failed to load invoices");
      setItems([]);
      return;
    }
    setError(null);
    setItems(payload.data.invoices);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Invoices</h2>
      <CreateInvoiceDraftForm
        clients={[{ id: clientId, name: clientName } satisfies ClientOption]}
        fixedClientId={clientId}
        onCreated={() => load()}
      />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Client invoices</CardTitle>
          <Link href={`/app/invoices?clientId=${clientId}`} className="text-xs text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Issue</th>
                  <th>Due</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 10).map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-medium">
                      <Link href={`/app/invoices/${invoice.id}`} className="text-primary hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td>
                      <InvoiceStatusBadge status={invoice.computedStatus} />
                    </td>
                    <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
                    <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td>{formatMinorCurrency(invoice.totalMinor, invoice.currency)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      No invoices for this client yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {error ? <div className="p-4 text-xs font-medium text-destructive">{error}</div> : null}
        </CardContent>
      </Card>
    </section>
  );
}
