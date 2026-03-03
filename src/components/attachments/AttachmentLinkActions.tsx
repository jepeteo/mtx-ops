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
    <div className="grid gap-1">
      <button type="button" onClick={unlinkAttachment} disabled={saving} className="form-btn-outline h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10">
        {saving ? "Unlinking…" : "Unlink"}
      </button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </div>
  );
}
