"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AckHandoverButton({ handoverId, disabled }: { handoverId: string; disabled: boolean }) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  async function onAck() {
    setSaving(true);
    const response = await fetch(`/api/handovers/${handoverId}/ack`, {
      method: "POST",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={onAck} disabled={disabled || saving}>
      {saving ? "Saving..." : "Acknowledge"}
    </button>
  );
}
