"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SendWeeklyDigestButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSend() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/digest/send", { method: "POST" });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
    setLoading(false);
    if (!res.ok || !body?.ok) {
      setMessage(body?.error?.message ?? "Send failed");
      return;
    }
    setMessage("Digest emailed to your account address.");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" onClick={onSend} disabled={loading}>
        {loading ? "Sending…" : "Email digest to me"}
      </Button>
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </div>
  );
}
