"use client";

import { useState } from "react";

type ServiceStatus = "ACTIVE" | "CANCELED" | "UNKNOWN";

export function UpdateServiceStatusButton({ serviceId, nextStatus }: { serviceId: string; nextStatus: ServiceStatus }) {
  const [loading, setLoading] = useState(false);

  async function onUpdate() {
    setLoading(true);

    const response = await fetch(`/api/services/${serviceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    setLoading(false);
    const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
    window.alert(body?.error?.message ?? "Status update failed");
  }

  return (
    <button type="button" onClick={onUpdate} disabled={loading} style={{ marginRight: 6 }}>
      {loading ? "Saving..." : nextStatus === "ACTIVE" ? "Activate" : "Cancel"}
    </button>
  );
}
