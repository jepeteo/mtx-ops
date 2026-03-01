"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

type ProjectOption = {
  id: string;
  name: string;
  keyPrefix: string;
};

export function TaskRowActions({
  taskId,
  title,
  status,
  dueAt,
  projectId,
  projects,
}: {
  taskId: string;
  title: string;
  status: TaskStatus;
  dueAt: string | null;
  projectId: string | null;
  projects: ProjectOption[];
}) {
  const router = useRouter();

  const [nextTitle, setNextTitle] = useState(title);
  const [nextStatus, setNextStatus] = useState<TaskStatus>(status);
  const [nextDueAt, setNextDueAt] = useState(dueAt ? dueAt.slice(0, 10) : "");
  const [nextProjectId, setNextProjectId] = useState(projectId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateTask() {
    setSaving(true);
    setError(null);

    if (nextTitle.trim().length < 1) {
      setSaving(false);
      setError("Task title is required");
      return;
    }

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: nextTitle.trim(),
        status: nextStatus,
        dueAt: nextDueAt ? new Date(`${nextDueAt}T00:00:00.000Z`).toISOString() : null,
        projectId: nextProjectId || null,
      }),
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
      <input
        value={nextTitle}
        onChange={(event) => setNextTitle(event.target.value)}
        placeholder="Task title"
        style={{ padding: 6, fontSize: 12 }}
      />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" value={nextDueAt} onChange={(event) => setNextDueAt(event.target.value)} style={{ padding: 6 }} />

        <select value={nextProjectId} onChange={(event) => setNextProjectId(event.target.value)} style={{ padding: 6 }}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.keyPrefix} · {project.name}
            </option>
          ))}
        </select>

        <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as TaskStatus)} style={{ padding: 6 }}>
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="DONE">DONE</option>
        </select>

        <button type="button" onClick={updateTask} disabled={saving}>
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
