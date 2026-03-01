"use client";

import { useMemo, useState } from "react";

function parseRules(raw: string) {
  const values = raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 365);

  return Array.from(new Set(values)).sort((left, right) => right - left);
}

export function UpdateServiceReminderRules({ serviceId, initialRules }: { serviceId: string; initialRules: number[] }) {
  const [rawRules, setRawRules] = useState(initialRules.join(","));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPreview = useMemo(() => parseRules(rawRules), [rawRules]);

  async function onSave() {
    setLoading(true);
    setError(null);

    if (normalizedPreview.length === 0) {
      setLoading(false);
      setError("Use comma-separated integers between 0 and 365");
      return;
    }

    const response = await fetch(`/api/services/${serviceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ reminderRules: normalizedPreview }),
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    setLoading(false);
    const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
    setError(body?.error?.message ?? "Reminder rules update failed");
  }

  return (
    <div style={{ display: "grid", gap: 4, minWidth: 190 }}>
      <input
        value={rawRules}
        onChange={(event) => setRawRules(event.target.value)}
        placeholder="60,30,14,7"
        style={{ padding: 6, fontSize: 12 }}
      />
      <button type="button" onClick={onSave} disabled={loading} style={{ fontSize: 12 }}>
        {loading ? "Saving..." : "Save reminders"}
      </button>
      {error ? <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
