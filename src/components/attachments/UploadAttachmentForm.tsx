"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EntityType = "Client" | "Project" | "Task";

export function UploadAttachmentForm({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const router = useRouter();

  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose a file first");
      return;
    }

    setSaving(true);
    setError(null);

    const presignResponse = await fetch("/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }),
    });

    if (!presignResponse.ok) {
      const payload = (await presignResponse.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(payload?.error?.message ?? "Failed to prepare upload");
      return;
    }

    const presignBody = (await presignResponse.json()) as {
      ok: true;
      data: {
        attachmentId: string;
        upload: {
          uploadUrl: string;
          method: "PUT";
          headers: Record<string, string>;
        };
      };
    };

    const uploadResponse = await fetch(presignBody.data.upload.uploadUrl, {
      method: presignBody.data.upload.method,
      headers: presignBody.data.upload.headers,
      body: file,
    });

    if (!uploadResponse.ok) {
      setSaving(false);
      setError("File upload failed");
      return;
    }

    const linkResponse = await fetch("/api/attachments/link", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        attachmentId: presignBody.data.attachmentId,
        entityType,
        entityId,
        label: label.trim() || null,
      }),
    });

    if (!linkResponse.ok) {
      const payload = (await linkResponse.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(payload?.error?.message ?? "Failed to link attachment");
      return;
    }

    setSaving(false);
    setLabel("");
    setFile(null);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-[720px] gap-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="form-input text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
          required
        />
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Optional label"
          className="form-input"
        />
      </div>

      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Uploading…" : "Upload attachment"}
      </button>

      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
