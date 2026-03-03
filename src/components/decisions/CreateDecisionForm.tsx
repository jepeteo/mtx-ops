"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EntityType = "Client" | "Project" | "Task";

export function CreateDecisionForm({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/decisions", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ entityType, entityId, title, body }),
    });

    if (response.ok) {
      setTitle("");
      setBody("");
      setSaving(false);
      router.refresh();
      return;
    }

    setSaving(false);
    const payload = (await response.json().catch(() => null)) as
      | { ok: false; error?: { message?: string } }
      | null;
    setError(payload?.error?.message ?? "Create decision failed");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Decision title"
        required
        className="form-input"
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        placeholder="Decision context and rationale..."
        required
        className="form-textarea"
      />

      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Add decision"}
      </button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
