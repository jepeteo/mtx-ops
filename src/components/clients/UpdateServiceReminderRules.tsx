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
    <div className="grid min-w-[190px] gap-1.5">
      <input value={rawRules} onChange={(event) => setRawRules(event.target.value)} placeholder="60,30,14,7" className="form-input h-7 text-xs" />
      <button type="button" onClick={onSave} disabled={loading} className="form-btn h-7 px-2.5 text-xs">
        {loading ? "Saving…" : "Save reminders"}
      </button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </div>
  );
}
