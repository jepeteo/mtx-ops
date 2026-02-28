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
    <button type="button" onClick={onDelete} disabled={loading} style={{ color: "#b91c1c" }}>
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
