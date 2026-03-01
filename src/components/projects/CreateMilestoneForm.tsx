"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProjectOption = {
  id: string;
  name: string;
  keyPrefix: string;
};

type MilestoneStatus = "OPEN" | "DONE";

export function CreateMilestoneForm({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [status, setStatus] = useState<MilestoneStatus>("OPEN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) {
      setError("Select a project");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        title,
        dueAt: dueAt ? new Date(`${dueAt}T00:00:00.000Z`).toISOString() : null,
        status,
      }),
    });

    if (response.ok) {
      setTitle("");
      setDueAt("");
      setStatus("OPEN");
      setSaving(false);
      router.refresh();
      return;
    }

    setSaving(false);
    const body = (await response.json().catch(() => null)) as
      | { ok: false; error?: { message?: string } }
      | null;
    setError(body?.error?.message ?? "Create milestone failed");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 720 }}>
      <div style={{ fontWeight: 600 }}>New milestone</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} style={{ padding: 8 }}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.keyPrefix} · {project.name}
            </option>
          ))}
        </select>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Milestone title"
          required
          style={{ padding: 8 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} style={{ padding: 8 }} />

        <select value={status} onChange={(event) => setStatus(event.target.value as MilestoneStatus)} style={{ padding: 8 }}>
          <option value="OPEN">OPEN</option>
          <option value="DONE">DONE</option>
        </select>
      </div>

      <button type="submit" disabled={saving} style={{ width: 170 }}>
        {saving ? "Saving..." : "Create milestone"}
      </button>
      {error ? <div style={{ color: "#ef4444" }}>{error}</div> : null}
    </form>
  );
}
