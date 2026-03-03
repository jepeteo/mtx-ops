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
    <form onSubmit={onSubmit} className="mb-3 grid max-w-[640px] gap-3 rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold">Add asset/link</div>
      <input placeholder="Label (e.g. Production Repo)" value={label} onChange={(event) => setLabel(event.target.value)} required className="form-input" />
      <input placeholder="URL" type="url" value={url} onChange={(event) => setUrl(event.target.value)} required className="form-input" />
      <input placeholder="Kind (e.g. repo, wp_admin, hosting_panel)" value={kind} onChange={(event) => setKind(event.target.value)} required className="form-input" />
      <input placeholder="Environment (optional, e.g. prod, stage)" value={environment} onChange={(event) => setEnvironment(event.target.value)} className="form-input" />
      <input placeholder="Tags (optional, comma-separated)" value={tags} onChange={(event) => setTags(event.target.value)} className="form-input" />

      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Create asset link"}
      </button>

      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
