"use client";

import { useState } from "react";

type NotificationActionsProps = {
  notificationId: string;
  status: "OPEN" | "SNOOZED" | "HANDLED";
};

export function NotificationActions({ notificationId, status }: NotificationActionsProps) {
  const [busy, setBusy] = useState(false);

  async function markHandled() {
    setBusy(true);
    await fetch(`/api/notifications/${notificationId}/mark-handled`, {
      method: "POST",
      headers: { accept: "application/json" },
    });
    window.location.reload();
  }

  async function snooze() {
    setBusy(true);
    await fetch(`/api/notifications/${notificationId}/snooze`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ minutes: 60 * 24 }),
    });
    window.location.reload();
  }

  return (
    <div className="flex gap-2">
      <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={snooze} disabled={busy || status === "HANDLED"}>
        Snooze 1d
      </button>
      <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={markHandled} disabled={busy || status === "HANDLED"}>
        Mark handled
      </button>
    </div>
  );
}
