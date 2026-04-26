"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiEnvelope, InvoiceRecord } from "./types";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; name: string };

function toIsoDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

export function CreateInvoiceDraftForm({
  clients,
  fixedClientId,
  onCreated,
}: {
  clients: ClientOption[];
  fixedClientId?: string;
  onCreated?: (invoice: InvoiceRecord) => void;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? "");
  const [currency, setCurrency] = useState("GBP");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [billingRecipient, setBillingRecipient] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId) {
      setError("Client is required");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId,
        currency: currency.toUpperCase(),
        issueDate: toIsoDate(issueDate),
        dueDate: toIsoDate(dueDate),
        billingRecipient: billingRecipient || null,
        billingEmail: billingEmail || null,
        lineItems: [],
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
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={currency}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          className="form-input"
          maxLength={3}
          placeholder="Currency"
        />
        <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className="form-input" />
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="form-input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={billingRecipient}
          onChange={(event) => setBillingRecipient(event.target.value)}
          className="form-input"
          placeholder="Billing recipient"
        />
        <input
          value={billingEmail}
          onChange={(event) => setBillingEmail(event.target.value)}
          className="form-input"
          placeholder="Billing email"
          type="email"
        />
      </div>
      <Button type="submit" className="w-fit" disabled={saving}>
        {saving ? "Creating..." : "Create draft"}
      </Button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
