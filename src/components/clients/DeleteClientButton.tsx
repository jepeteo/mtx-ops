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
    <div style={{ marginTop: 16 }}>
      <button type="button" onClick={onDelete} disabled={loading} style={{ color: "#fff", background: "#b91c1c", border: 0, padding: "8px 12px", borderRadius: 6 }}>
        {loading ? "Deleting..." : "Delete client"}
      </button>
      {error ? <div style={{ marginTop: 8, color: "#ef4444" }}>{error}</div> : null}
    </div>
  );
}
