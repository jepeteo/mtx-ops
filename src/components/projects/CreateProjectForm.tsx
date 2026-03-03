"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClientOption = {
  id: string;
  name: string;
};

type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export function CreateProjectForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();

  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [name, setName] = useState("");
  const [keyPrefix, setKeyPrefix] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId) {
      setError("Select a client first");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/clients/${clientId}/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        keyPrefix: keyPrefix.trim().toUpperCase(),
        status,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(body?.error?.message ?? "Create project failed");
      return;
    }

    setName("");
    setKeyPrefix("");
    setStatus("ACTIVE");
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-[720px] gap-3 rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold">New project</div>

      <div className="grid grid-cols-2 gap-3">
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="form-select">
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Project name"
          required
          className="form-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          value={keyPrefix}
          onChange={(event) => setKeyPrefix(event.target.value.toUpperCase())}
          placeholder="Key prefix (e.g. MTXCF)"
          required
          className="form-input"
        />

        <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="form-select">
          <option value="ACTIVE">ACTIVE</option>
          <option value="ON_HOLD">ON_HOLD</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>

      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Create project"}
      </button>

      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
