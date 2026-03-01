"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MilestoneStatus = "OPEN" | "DONE";

export function MilestoneRowActions({
  milestoneId,
  title,
  dueAt,
  status,
}: {
  milestoneId: string;
  title: string;
  dueAt: string | null;
  status: MilestoneStatus;
}) {
  const router = useRouter();

  const [nextTitle, setNextTitle] = useState(title);
  const [nextDueAt, setNextDueAt] = useState(dueAt ? dueAt.slice(0, 10) : "");
  const [nextStatus, setNextStatus] = useState<MilestoneStatus>(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveMilestone() {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/milestones/${milestoneId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        title: nextTitle.trim(),
        dueAt: nextDueAt ? new Date(`${nextDueAt}T00:00:00.000Z`).toISOString() : null,
        status: nextStatus,
      }),
    });

    if (response.ok) {
      setSaving(false);
      router.refresh();
      return;
    }

    setSaving(false);
    const body = (await response.json().catch(() => null)) as
      | { ok: false; error?: { message?: string } }
      | null;
    setError(body?.error?.message ?? "Update milestone failed");
  }

  async function deleteMilestone() {
    const confirmed = window.confirm("Delete this milestone?");
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/milestones/${milestoneId}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    });

    if (response.ok) {
      setSaving(false);
      router.refresh();
      return;
    }

    setSaving(false);
    const body = (await response.json().catch(() => null)) as
      | { ok: false; error?: { message?: string } }
      | null;
    setError(body?.error?.message ?? "Delete milestone failed");
  }

  return (
    <div style={{ display: "grid", gap: 4 }}>
      <input value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} style={{ padding: 6, fontSize: 12 }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" value={nextDueAt} onChange={(event) => setNextDueAt(event.target.value)} style={{ padding: 6 }} />
        <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as MilestoneStatus)} style={{ padding: 6 }}>
          <option value="OPEN">OPEN</option>
          <option value="DONE">DONE</option>
        </select>
        <button type="button" onClick={saveMilestone} disabled={saving}>
          Save
        </button>
        <button type="button" onClick={deleteMilestone} disabled={saving} style={{ color: "#b91c1c" }}>
          Delete
        </button>
      </div>
      {error ? <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
