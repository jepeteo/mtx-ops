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
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 640 }}>
      <div style={{ fontWeight: 600 }}>New task</div>

      <input
        placeholder="Task title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        style={{ padding: 8 }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} style={{ padding: 8 }}>
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="DONE">DONE</option>
        </select>

        <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} style={{ padding: 8 }}>
          <option value="">No client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} style={{ padding: 8 }}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.keyPrefix} · {project.name}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={saving} style={{ width: 160 }}>
        {saving ? "Saving..." : "Create task"}
      </button>

      {error ? <div style={{ color: "#ef4444" }}>{error}</div> : null}
    </form>
  );
}
