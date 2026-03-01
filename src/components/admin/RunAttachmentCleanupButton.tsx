"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CleanupData = {
  scanned: number;
  deleted: number;
  failed: number;
  orphanMinAgeHours: number;
  batchSize: number;
};

export function RunAttachmentCleanupButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CleanupData | null>(null);

  function pushResultParams(input: { run: "ok" | "error"; message?: string; result?: CleanupData }) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("cleanupRun", input.run);

    if (input.run === "ok" && input.result) {
      params.set("cleanupScanned", String(input.result.scanned));
      params.set("cleanupDeleted", String(input.result.deleted));
      params.set("cleanupFailed", String(input.result.failed));
      params.delete("cleanupMessage");
    } else {
      params.delete("cleanupScanned");
      params.delete("cleanupDeleted");
      params.delete("cleanupFailed");
      params.set("cleanupMessage", input.message ?? "Cleanup run failed");
    }

    router.push(`/app/admin/operations?${params.toString()}`);
    router.refresh();
  }

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
      const message = (payload as { ok: false; error?: { message?: string } } | null)?.error?.message ?? "Cleanup run failed";
      setError(message);
      pushResultParams({ run: "error", message });
      return;
    }

    setResult(payload.data);
    setRunning(false);
    pushResultParams({ run: "ok", result: payload.data });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={running}
        onClick={runCleanup}
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
