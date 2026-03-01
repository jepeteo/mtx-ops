"use client";

import { useState } from "react";

export function DeleteAssetLinkButton({ linkId }: { linkId: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const confirmed = window.confirm("Delete this asset link?");
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    const response = await fetch(`/api/asset-links/${linkId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setDeleting(false);
      setError(body?.error?.message ?? "Delete failed");
      return;
    }

    window.location.reload();
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button type="button" onClick={onDelete} disabled={deleting}>
        {deleting ? "Deleting..." : "Delete"}
      </button>
      {error ? <span style={{ color: "#ef4444", fontSize: 12 }}>{error}</span> : null}
    </div>
  );
}
