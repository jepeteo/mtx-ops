"use client";

import { useState } from "react";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const confirmed = window.confirm("Delete this client? This action cannot be undone.");
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/clients/${clientId}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setLoading(false);
      setError(payload?.error?.message ?? "Delete failed");
      return;
    }

    window.location.href = "/app/clients";
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={onDelete} disabled={loading} className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90">
        {loading ? "Deleting…" : "Delete client"}
      </button>
      {error ? <div className="mt-2 text-xs font-medium text-destructive">{error}</div> : null}
    </div>
  );
}
