"use client";

import { useState } from "react";

type ServiceType = "DOMAIN" | "HOSTING" | "EMAIL" | "CDN" | "LICENSE" | "MONITORING" | "PAYMENT" | "CMS" | "OTHER";

export function CreateServiceForm({ clientId }: { clientId: string }) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [type, setType] = useState<ServiceType>("OTHER");
  const [renewalDate, setRenewalDate] = useState("");
  const [reminderRules, setReminderRules] = useState("60,30,14,7");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseRules(raw: string) {
    const values = raw
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 365);

    const deduped = Array.from(new Set(values)).sort((left, right) => right - left);
    return deduped;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const parsedReminderRules = parseRules(reminderRules);
    if (parsedReminderRules.length === 0) {
      setSaving(false);
      setError("Reminder days must be comma-separated integers between 0 and 365");
      return;
    }

    const response = await fetch(`/api/clients/${clientId}/services`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        provider,
        type,
        status: "ACTIVE",
        renewalDate: renewalDate ? new Date(`${renewalDate}T00:00:00.000Z`).toISOString() : null,
        reminderRules: parsedReminderRules,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(body?.error?.message ?? "Create service failed");
      return;
    }

    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="mb-3 grid max-w-[560px] gap-3 rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold">Add service</div>
      <input placeholder="Service name" value={name} onChange={(event) => setName(event.target.value)} required className="form-input" />
      <input placeholder="Provider" value={provider} onChange={(event) => setProvider(event.target.value)} required className="form-input" />
      <select value={type} onChange={(event) => setType(event.target.value as ServiceType)} className="form-select">
        <option value="DOMAIN">DOMAIN</option>
        <option value="HOSTING">HOSTING</option>
        <option value="EMAIL">EMAIL</option>
        <option value="CDN">CDN</option>
        <option value="LICENSE">LICENSE</option>
        <option value="MONITORING">MONITORING</option>
        <option value="PAYMENT">PAYMENT</option>
        <option value="CMS">CMS</option>
        <option value="OTHER">OTHER</option>
      </select>
      <input type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} className="form-input" />
      <input placeholder="Reminder days (e.g. 60,30,14,7)" value={reminderRules} onChange={(event) => setReminderRules(event.target.value)} className="form-input" />
      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Create service"}
      </button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
