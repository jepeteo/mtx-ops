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
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 720 }}>
      <div style={{ fontWeight: 600 }}>New project</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} style={{ padding: 8 }}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Project name"
          required
          style={{ padding: 8 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          value={keyPrefix}
          onChange={(event) => setKeyPrefix(event.target.value.toUpperCase())}
          placeholder="Key prefix (e.g. MTXCF)"
          required
          style={{ padding: 8 }}
        />

        <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} style={{ padding: 8 }}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ON_HOLD">ON_HOLD</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>

      <button type="submit" disabled={saving} style={{ width: 160 }}>
        {saving ? "Saving..." : "Create project"}
      </button>

      {error ? <div style={{ color: "#ef4444" }}>{error}</div> : null}
    </form>
  );
}
