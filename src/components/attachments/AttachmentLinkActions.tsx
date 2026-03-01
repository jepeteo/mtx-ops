"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AttachmentLinkActions({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlinkAttachment() {
    const confirmed = window.confirm("Unlink this attachment from the current entity?");
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/attachments/links/${linkId}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(payload?.error?.message ?? "Failed to unlink attachment");
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 4 }}>
      <button type="button" onClick={unlinkAttachment} disabled={saving} style={{ color: "#b91c1c" }}>
        {saving ? "Unlinking..." : "Unlink"}
      </button>
      {error ? <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
