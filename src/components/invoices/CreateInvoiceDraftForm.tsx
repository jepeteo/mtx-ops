"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiEnvelope, InvoiceRecord } from "./types";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; name: string };

export type InvoiceLinePreset = {
  description: string;
  quantity: string;
  unitPriceMinor: number;
  taxMode?: "uk_vat" | "reverse_charge" | "none";
  taxRateBps?: number;
};

function toIsoDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

export function CreateInvoiceDraftForm({
  clients,
  fixedClientId,
  sourceServiceId,
  initialLineItems,
  onCreated,
}: {
  clients: ClientOption[];
  fixedClientId?: string;
  sourceServiceId?: string;
  initialLineItems?: InvoiceLinePreset[];
  onCreated?: (invoice: InvoiceRecord) => void;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? "");
  const [currency, setCurrency] = useState("GBP");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [defaultTaxMode, setDefaultTaxMode] = useState<"uk_vat" | "reverse_charge" | "none">("none");
  const [billingEmail, setBillingEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixedClientId) {
      setClientId(fixedClientId);
      return;
    }
    setClientId((prev) => {
      if (prev && clients.some((c) => c.id === prev)) return prev;
      return clients[0]?.id ?? "";
    });
  }, [clients, fixedClientId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/workspace/settings", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as
        | {
            ok: true;
            data: {
              settings: {
                invoicing: {
                  defaultCurrency: string;
                  defaultPaymentTerms: string | null;
                  defaultTaxMode: "uk_vat" | "reverse_charge" | "none";
                };
              };
            };
          }
        | { ok: false }
        | null;
      if (cancelled || !res.ok || !body || !body.ok) return;
      setCurrency(body.data.settings.invoicing.defaultCurrency);
      setPaymentTerms(body.data.settings.invoicing.defaultPaymentTerms ?? "");
      setDefaultTaxMode(body.data.settings.invoicing.defaultTaxMode ?? "none");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/clients/${clientId}/contacts`, { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as
        | { ok: true; data: { contacts: Array<{ isPrimary: boolean; email: string | null }> } }
        | { ok: false }
        | null;
      if (cancelled || !res.ok || !body || !body.ok) return;
      const primary = body.data.contacts.find((c) => c.isPrimary && c.email);
      setBillingEmail(primary?.email ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId) {
      setError("Client is required");
      return;
    }

    setSaving(true);
    setError(null);

    const lineItems =
      initialLineItems?.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        taxMode: line.taxMode ?? defaultTaxMode,
        taxRateBps: line.taxRateBps ?? 0,
      })) ?? [];

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId,
        currency: currency.toUpperCase(),
        paymentTerms: paymentTerms.trim() || null,
        issueDate: toIsoDate(issueDate),
        dueDate: toIsoDate(dueDate),
        billingEmail: billingEmail || undefined,
        lineItems,
        ...(sourceServiceId ? { sourceServiceId } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<{ invoice: InvoiceRecord }>
      | null;

    if (!response.ok || !payload || !payload.ok) {
      setSaving(false);
      setError(payload && !payload.ok ? payload.error.message : "Create invoice failed");
      return;
    }

    setSaving(false);
    onCreated?.(payload.data.invoice);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-3 rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold">Create invoice draft</div>
      {!fixedClientId && (
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="form-select">
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={currency}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          className="form-input"
          maxLength={3}
          placeholder="Currency"
        />
        <input
          value={paymentTerms}
          onChange={(event) => setPaymentTerms(event.target.value)}
          className="form-input"
          placeholder="Payment terms"
        />
        <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className="form-input" />
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="form-input" />
      </div>
      <p className="text-xs text-muted-foreground">
        Billing details are taken from the client profile
        {billingEmail ? ` (email: ${billingEmail})` : ""}. You can edit them on the invoice after creation.
      </p>
      {initialLineItems && initialLineItems.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          First line: {initialLineItems[0]?.description}
        </p>
      ) : null}
      <Button type="submit" className="w-fit" disabled={saving}>
        {saving ? "Creating..." : "Create draft"}
      </Button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
