"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EntityType = "Client" | "Project" | "Task";

type UserOption = {
  id: string;
  label: string;
};

export function CreateHandoverForm({
  entityType,
  entityId,
  users,
}: {
  entityType: EntityType;
  entityId: string;
  users: UserOption[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toUserId, setToUserId] = useState(users[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!toUserId) {
      setError("Select a recipient");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch("/api/handovers", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ entityType, entityId, title, body, toUserId }),
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
    setError(payload?.error?.message ?? "Create handover failed");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Handover title"
        required
        className="form-input"
      />

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        placeholder="What should the next person know and do?"
        required
        className="form-textarea"
      />

      <select value={toUserId} onChange={(event) => setToUserId(event.target.value)} className="form-select">
        {users.map((user) => (
          <option key={user.id} value={user.id}>{user.label}</option>
        ))}
      </select>

      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Create handover"}
      </button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
