"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export function TaskRowActions({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const router = useRouter();

  const [nextStatus, setNextStatus] = useState<TaskStatus>(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus() {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(body?.error?.message ?? "Update task failed");
      return;
    }

    setSaving(false);
    router.refresh();
  }

  async function deleteTask() {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(body?.error?.message ?? "Delete task failed");
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as TaskStatus)} style={{ padding: 6 }}>
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="DONE">DONE</option>
        </select>

        <button type="button" onClick={updateStatus} disabled={saving}>
          Save
        </button>

        <button type="button" onClick={deleteTask} disabled={saving}>
          Delete
        </button>
      </div>
      {error ? <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
