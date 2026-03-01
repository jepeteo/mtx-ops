"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CleanupData = {
  scanned: number;
  deleted: number;
  failed: number;
  orphanMinAgeHours: number;
  batchSize: number;
};

export function RunAttachmentCleanupButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CleanupData | null>(null);

  async function runCleanup() {
    setRunning(true);
    setError(null);

    const response = await fetch("/api/admin/operations/attachments-cleanup/run", {
      method: "POST",
      headers: { accept: "application/json" },
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok: true; data: CleanupData }
      | { ok: false; error?: { message?: string } }
      | null;

    if (!response.ok || !payload || payload.ok !== true) {
      setRunning(false);
      setError((payload as { ok: false; error?: { message?: string } } | null)?.error?.message ?? "Cleanup run failed");
      return;
    }

    setResult(payload.data);
    setRunning(false);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={runCleanup}
        disabled={running}
        className="w-fit rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60"
      >
        {running ? "Running cleanup..." : "Run Attachment Cleanup Now"}
      </button>
      {result ? (
        <div className="text-xs text-muted-foreground">
          Done: scanned {result.scanned}, deleted {result.deleted}, failed {result.failed}
        </div>
      ) : null}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
