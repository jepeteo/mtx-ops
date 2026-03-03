"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClientOption = {
  id: string;
  name: string;
};

type ProjectOption = {
  id: string;
  name: string;
  keyPrefix: string;
  clientId: string;
};

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export function CreateTaskForm({ clients, projects }: { clients: ClientOption[]; projects: ProjectOption[] }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [dueAt, setDueAt] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        status,
        dueAt: dueAt ? new Date(`${dueAt}T00:00:00.000Z`).toISOString() : null,
        clientId: clientId || null,
        projectId: projectId || null,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(body?.error?.message ?? "Create task failed");
      return;
    }

    setTitle("");
    setStatus("TODO");
    setDueAt("");
    setClientId("");
    setProjectId("");
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-[640px] gap-3 rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold">New task</div>

      <input
        placeholder="Task title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        className="form-input"
      />

      <div className="grid grid-cols-2 gap-3">
        <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="form-select">
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="DONE">DONE</option>
        </select>

        <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="form-input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="form-select">
          <option value="">No client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>

        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="form-select">
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.keyPrefix} · {project.name}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Create task"}
      </button>

      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
