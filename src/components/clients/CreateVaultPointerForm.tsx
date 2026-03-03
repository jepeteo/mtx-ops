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
    <form onSubmit={onSubmit} className="grid max-w-[760px] gap-3 rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold">Add vault pointer</div>
      <div className="grid grid-cols-2 gap-3">
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label" required className="form-input" />
        <input value={vaultItemId} onChange={(event) => setVaultItemId(event.target.value)} placeholder="Vault item ID" required className="form-input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input value={fieldName} onChange={(event) => setFieldName(event.target.value)} placeholder="Field name" required className="form-input" />
        <input value={usernameHint} onChange={(event) => setUsernameHint(event.target.value)} placeholder="Username hint (optional)" className="form-input" />
      </div>
      <button type="submit" disabled={saving} className="form-btn w-fit">
        {saving ? "Saving…" : "Create pointer"}
      </button>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </form>
  );
}
