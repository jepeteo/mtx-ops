"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateVaultPointerForm({ clientId }: { clientId: string }) {
  const router = useRouter();

  const [label, setLabel] = useState("");
  const [vaultItemId, setVaultItemId] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [usernameHint, setUsernameHint] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/vault/pointers", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        clientId,
        label,
        vaultItemId,
        fieldName,
        usernameHint: usernameHint.trim() || null,
      }),
    });

    if (response.ok) {
      setLabel("");
      setVaultItemId("");
      setFieldName("");
      setUsernameHint("");
      setSaving(false);
      router.refresh();
      return;
    }

    setSaving(false);
    const payload = (await response.json().catch(() => null)) as
      | { ok: false; error?: { message?: string } }
      | null;
    setError(payload?.error?.message ?? "Create pointer failed");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 760 }}>
      <div style={{ fontWeight: 600 }}>Add vault pointer</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label" required style={{ padding: 8 }} />
        <input value={vaultItemId} onChange={(event) => setVaultItemId(event.target.value)} placeholder="Vault item ID" required style={{ padding: 8 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input value={fieldName} onChange={(event) => setFieldName(event.target.value)} placeholder="Field name" required style={{ padding: 8 }} />
        <input value={usernameHint} onChange={(event) => setUsernameHint(event.target.value)} placeholder="Username hint (optional)" style={{ padding: 8 }} />
      </div>
      <button type="submit" disabled={saving} style={{ width: 170 }}>
        {saving ? "Saving..." : "Create pointer"}
      </button>
      {error ? <div style={{ color: "#ef4444" }}>{error}</div> : null}
    </form>
  );
}
