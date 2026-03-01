"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EntityType = "Client" | "Project" | "Task";

export function CreateNoteForm({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const router = useRouter();

  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        body,
      }),
    });

    if (response.ok) {
      setBody("");
      setSaving(false);
      router.refresh();
      return;
    }

    setSaving(false);
    const payload = (await response.json().catch(() => null)) as
      | { ok: false; error?: { message?: string } }
      | null;
    setError(payload?.error?.message ?? "Create note failed");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        placeholder="Add context, decision details, or handover note..."
        required
        style={{ width: "100%", padding: 8 }}
      />

      <button type="submit" disabled={saving} style={{ width: 130 }}>
        {saving ? "Saving..." : "Add note"}
      </button>

      {error ? <div style={{ color: "#ef4444" }}>{error}</div> : null}
    </form>
  );
}
