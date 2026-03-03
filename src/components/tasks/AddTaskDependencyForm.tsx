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
    <form onSubmit={onSubmit} className="grid max-w-[720px] gap-3 rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold">Add dependency</div>
      <div className="grid grid-cols-2 gap-3">
        <select value={blockedTaskId} onChange={(event) => setBlockedTaskId(event.target.value)} className="form-select">
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>Blocked: {task.title}</option>
          ))}
        </select>

        <select value={blockerTaskId} onChange={(event) => setBlockerTaskId(event.target.value)} className="form-select">
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>Blocker: {task.title}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Create dependency"}
      </button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
