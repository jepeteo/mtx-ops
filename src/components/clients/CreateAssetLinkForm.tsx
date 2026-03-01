"use client";

import { useState } from "react";

export function CreateAssetLinkForm({ clientId }: { clientId: string }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState("resource");
  const [environment, setEnvironment] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/clients/${clientId}/asset-links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        label,
        url,
        environment: environment || null,
        tags: tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(body?.error?.message ?? "Create asset link failed");
      return;
    }

    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 640, marginBottom: 12 }}>
      <div style={{ fontWeight: 600 }}>Add asset/link</div>
      <input
        placeholder="Label (e.g. Production Repo)"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        required
        style={{ padding: 8 }}
      />
      <input
        placeholder="URL"
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        required
        style={{ padding: 8 }}
      />
      <input
        placeholder="Kind (e.g. repo, wp_admin, hosting_panel)"
        value={kind}
        onChange={(event) => setKind(event.target.value)}
        required
        style={{ padding: 8 }}
      />
      <input
        placeholder="Environment (optional, e.g. prod, stage)"
        value={environment}
        onChange={(event) => setEnvironment(event.target.value)}
        style={{ padding: 8 }}
      />
      <input
        placeholder="Tags (optional, comma-separated)"
        value={tags}
        onChange={(event) => setTags(event.target.value)}
        style={{ padding: 8 }}
      />

      <button type="submit" disabled={saving} style={{ width: 180 }}>
        {saving ? "Saving..." : "Create asset link"}
      </button>

      {error ? <div style={{ color: "#ef4444" }}>{error}</div> : null}
    </form>
  );
}
