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
    <form onSubmit={onSubmit} className="grid max-w-[720px] gap-3 rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold">New milestone</div>
      <div className="grid grid-cols-2 gap-3">
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="form-select">
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.keyPrefix} · {project.name}</option>
          ))}
        </select>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Milestone title"
          required
          className="form-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="form-input" />

        <select value={status} onChange={(event) => setStatus(event.target.value as MilestoneStatus)} className="form-select">
          <option value="OPEN">OPEN</option>
          <option value="DONE">DONE</option>
        </select>
      </div>

      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Create milestone"}
      </button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
