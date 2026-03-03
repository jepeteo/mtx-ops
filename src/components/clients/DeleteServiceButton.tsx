"use client";

import { useState } from "react";

export function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const confirmed = window.confirm("Delete this service?");
    if (!confirmed) return;

    setLoading(true);

    const response = await fetch(`/api/services/${serviceId}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    setLoading(false);
    const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
    window.alert(body?.error?.message ?? "Delete failed");
  }

  return (
    <button type="button" onClick={onDelete} disabled={loading} className="form-btn-outline h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10">
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
