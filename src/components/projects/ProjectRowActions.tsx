"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export function ProjectRowActions({
  projectId,
  name,
  keyPrefix,
  status,
}: {
  projectId: string;
  name: string;
  keyPrefix: string;
  status: ProjectStatus;
}) {
  const router = useRouter();

  const [nextName, setNextName] = useState(name);
  const [nextKeyPrefix, setNextKeyPrefix] = useState(keyPrefix);
  const [nextStatus, setNextStatus] = useState<ProjectStatus>(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProject() {
    setSaving(true);
    setError(null);

    const normalizedKeyPrefix = nextKeyPrefix.trim().toUpperCase();
    if (!normalizedKeyPrefix.match(/^[A-Z0-9]{2,16}$/)) {
      setSaving(false);
      setError("Key prefix must be 2-16 chars (A-Z, 0-9)");
      return;
    }

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        name: nextName.trim(),
        keyPrefix: normalizedKeyPrefix,
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
    setError(body?.error?.message ?? "Update project failed");
  }

  async function deleteProject() {
    const confirmed = window.confirm("Delete this project? Tasks will remain but lose project link.");
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/projects/${projectId}`, {
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
    setError(body?.error?.message ?? "Delete project failed");
  }

  return (
    <div className="grid gap-1.5">
      <input
        value={nextName}
        onChange={(event) => setNextName(event.target.value)}
        placeholder="Project name"
        className="form-input h-7 text-xs"
      />
      <div className="flex items-center gap-1.5">
        <input
          value={nextKeyPrefix}
          onChange={(event) => setNextKeyPrefix(event.target.value.toUpperCase())}
          placeholder="Prefix"
          className="form-input h-7 w-[110px] text-xs"
        />

        <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ProjectStatus)} className="form-select h-7 text-xs">
          <option value="ACTIVE">ACTIVE</option>
          <option value="ON_HOLD">ON_HOLD</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>

        <button type="button" onClick={saveProject} disabled={saving} className="form-btn h-7 px-2.5 text-xs">
          Save
        </button>

        <button type="button" onClick={deleteProject} disabled={saving} className="form-btn-outline h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10">
          Delete
        </button>
      </div>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </div>
  );
}
