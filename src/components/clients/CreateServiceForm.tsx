"use client";

import { useState } from "react";

type ServiceType = "DOMAIN" | "HOSTING" | "EMAIL" | "CDN" | "LICENSE" | "MONITORING" | "PAYMENT" | "CMS" | "OTHER";

export function CreateServiceForm({ clientId }: { clientId: string }) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [type, setType] = useState<ServiceType>("OTHER");
  const [renewalDate, setRenewalDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/clients/${clientId}/services`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        provider,
        type,
        status: "ACTIVE",
        renewalDate: renewalDate ? new Date(`${renewalDate}T00:00:00.000Z`).toISOString() : null,
        reminderRules: [60, 30, 14, 7],
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
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 560, marginBottom: 14 }}>
      <div style={{ fontWeight: 600 }}>Add service</div>

      <input
        placeholder="Service name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        style={{ padding: 8 }}
      />

      <input
        placeholder="Provider"
        value={provider}
        onChange={(event) => setProvider(event.target.value)}
        required
        style={{ padding: 8 }}
      />

      <select value={type} onChange={(event) => setType(event.target.value as ServiceType)} style={{ padding: 8 }}>
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

      <input type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} style={{ padding: 8 }} />

      <button type="submit" disabled={saving} style={{ width: 160 }}>
        {saving ? "Saving..." : "Create service"}
      </button>

      {error ? <div style={{ color: "#ef4444" }}>{error}</div> : null}
    </form>
  );
}
