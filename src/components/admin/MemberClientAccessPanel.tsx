"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; name: string };

export function MemberClientAccessPanel({
  userId,
  userEmail,
  allClients,
}: {
  userId: string;
  userEmail: string;
  allClients: ClientOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/users/${userId}/client-access`, { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as
        | { ok: true; data: { clientIds: string[] } }
        | null;
      if (cancelled) return;
      if (res.ok && body?.ok) {
        setSelected(new Set(body.data.clientIds));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function toggle(clientId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${userId}/client-access`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientIds: [...selected] }),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
    setSaving(false);
    if (!res.ok || !body?.ok) {
      setMessage(body?.error?.message ?? "Save failed");
      return;
    }
    setMessage("Client access saved.");
  }

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading client access…</div>;
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border bg-secondary/30 p-3">
      <div className="text-xs font-medium">Client access for {userEmail}</div>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {allClients.map((client) => (
          <label key={client.id} className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={selected.has(client.id)} onChange={() => toggle(client.id)} />
            {client.name}
          </label>
        ))}
        {allClients.length === 0 ? <div className="text-xs text-muted-foreground">No clients in workspace.</div> : null}
      </div>
      <Button type="button" size="sm" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save access"}
      </Button>
      {message ? <div className="text-xs text-muted-foreground">{message}</div> : null}
    </div>
  );
}
