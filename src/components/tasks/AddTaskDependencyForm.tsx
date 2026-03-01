"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TaskOption = {
  id: string;
  title: string;
};

export function AddTaskDependencyForm({ tasks }: { tasks: TaskOption[] }) {
  const router = useRouter();

  const [blockedTaskId, setBlockedTaskId] = useState(tasks[0]?.id ?? "");
  const [blockerTaskId, setBlockerTaskId] = useState(tasks[1]?.id ?? tasks[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockedTaskId || !blockerTaskId) {
      setError("Select both tasks");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/tasks/${blockedTaskId}/dependencies`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ blockerTaskId }),
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
    setError(body?.error?.message ?? "Create dependency failed");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 720 }}>
      <div style={{ fontWeight: 600 }}>Add dependency</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select value={blockedTaskId} onChange={(event) => setBlockedTaskId(event.target.value)} style={{ padding: 8 }}>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              Blocked: {task.title}
            </option>
          ))}
        </select>

        <select value={blockerTaskId} onChange={(event) => setBlockerTaskId(event.target.value)} style={{ padding: 8 }}>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              Blocker: {task.title}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={saving} style={{ width: 180 }}>
        {saving ? "Saving..." : "Create dependency"}
      </button>
      {error ? <div style={{ color: "#ef4444" }}>{error}</div> : null}
    </form>
  );
}
