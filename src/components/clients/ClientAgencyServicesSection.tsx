"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";
import { formatMinorCurrency } from "@/lib/invoices/ui";

type AgencyService = {
  id: string;
  name: string;
  description: string | null;
  billingCadence: string;
  amountMinor: number | null;
  currency: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
};

const CADENCES = ["monthly", "quarterly", "annual", "ad_hoc"] as const;
const STATUSES = ["active", "paused", "ended"] as const;

export function ClientAgencyServicesSection({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<AgencyService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [billingCadence, setBillingCadence] = useState<(typeof CADENCES)[number]>("monthly");
  const [amountMinor, setAmountMinor] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("active");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/agency-services`, { cache: "no-store" });
    const body = (await res.json().catch(() => null)) as
      | { ok: true; data: { agencyServices: AgencyService[] } }
      | { ok: false; error?: { message?: string } }
      | null;
    if (!res.ok || !body || !body.ok) {
      setError(body && !body.ok ? body.error?.message ?? "Failed to load" : "Failed to load");
      setItems([]);
      return;
    }
    setError(null);
    setItems(body.data.agencyServices);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const parsedAmount = amountMinor.trim() ? Math.round(Number(amountMinor) * 100) : null;
    const res = await fetch(`/api/clients/${clientId}/agency-services`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        billingCadence,
        amountMinor: parsedAmount,
        currency: parsedAmount != null ? currency.toUpperCase() : null,
        status,
      }),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
    setSaving(false);
    if (!res.ok || !body?.ok) {
      setError(body?.error?.message ?? "Create failed");
      return;
    }
    setName("");
    setDescription("");
    setAmountMinor("");
    await load();
  }

  async function onDelete(id: string, label: string) {
    if (!window.confirm(`Delete agency service ${label}?`)) return;
    const res = await fetch(`/api/agency-services/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Briefcase className="h-4 w-4 text-muted-foreground" /> Agency services
      </h2>
      <p className="text-xs text-muted-foreground">What this client pays MTX for (separate from external subscription renewals).</p>
      <form onSubmit={onCreate} className="grid max-w-3xl gap-2 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-semibold">Add agency service</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Name" required />
          <select value={billingCadence} onChange={(e) => setBillingCadence(e.target.value as (typeof CADENCES)[number])} className="form-select">
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input value={amountMinor} onChange={(e) => setAmountMinor(e.target.value)} className="form-input" placeholder="Amount (major units)" type="number" min="0" step="0.01" />
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="form-input" maxLength={3} placeholder="Currency" />
          <select value={status} onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])} className="form-select">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="form-input sm:col-span-2" placeholder="Description" />
        </div>
        <Button type="submit" className="w-fit" disabled={saving}>
          {saving ? "Saving…" : "Add agency service"}
        </Button>
      </form>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Cadence</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td>{item.billingCadence}</td>
                    <td>
                      {item.amountMinor != null && item.currency
                        ? formatMinorCurrency(item.amountMinor, item.currency)
                        : "—"}
                    </td>
                    <td>{item.status}</td>
                    <td>
                      <button
                        type="button"
                        className="form-btn-outline h-7 px-2 text-xs text-destructive"
                        onClick={() => onDelete(item.id, item.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      No agency services yet.
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
