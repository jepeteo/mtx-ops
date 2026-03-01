"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VaultPointerActions({
  pointer,
  clientId,
}: {
  pointer: {
    id: string;
    label: string;
    vaultItemId: string;
    fieldName: string;
    usernameHint: string | null;
  };
  clientId: string;
}) {
  const router = useRouter();

  const [label, setLabel] = useState(pointer.label);
  const [vaultItemId, setVaultItemId] = useState(pointer.vaultItemId);
  const [fieldName, setFieldName] = useState(pointer.fieldName);
  const [usernameHint, setUsernameHint] = useState(pointer.usernameHint ?? "");
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function savePointer() {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/vault/pointers/${pointer.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        label,
        vaultItemId,
        fieldName,
        usernameHint: usernameHint.trim() || null,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(payload?.error?.message ?? "Update pointer failed");
      return;
    }

    setSaving(false);
    router.refresh();
  }

  async function deletePointer() {
    const confirmed = window.confirm("Delete this vault pointer?");
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/vault/pointers/${pointer.id}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { ok: false; error?: { message?: string } }
        | null;
      setSaving(false);
      setError(payload?.error?.message ?? "Delete pointer failed");
      return;
    }

    setSaving(false);
    router.refresh();
  }

  async function revealSecret() {
    setSaving(true);
    setError(null);
    setCopyStatus(null);
    setRevealedValue(null);
    setIsSecretVisible(false);

    const response = await fetch("/api/vault/reveal", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        vaultItemId,
        fieldName,
        clientId,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok: true; data?: { value?: string } }
      | { ok: false; error?: { message?: string; code?: string } }
      | null;

    if (!response.ok || !payload || payload.ok !== true) {
      setSaving(false);
      const failedPayload = payload as { ok: false; error?: { message?: string; code?: string } } | null;
      const code = failedPayload?.error?.code;

      if (code === "UPSTREAM_UNAVAILABLE") {
        setError("Vault is currently unavailable. Retry shortly or verify Vaultwarden connectivity.");
      } else if (code === "VALIDATION_ERROR") {
        setError("Pointer configuration is invalid. Check vault item ID and field name.");
      } else {
        setError(failedPayload?.error?.message ?? "Reveal failed");
      }
      return;
    }

    setSaving(false);
    setRevealedValue(payload.data?.value ?? "");
    setIsSecretVisible(false);
  }

  async function copySecret() {
    if (!revealedValue) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(revealedValue);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = revealedValue;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopyStatus("Copied");
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus("Copy failed");
      setTimeout(() => setCopyStatus(null), 2000);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <input value={label} onChange={(event) => setLabel(event.target.value)} style={{ padding: 6 }} />
        <input value={vaultItemId} onChange={(event) => setVaultItemId(event.target.value)} style={{ padding: 6 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <input value={fieldName} onChange={(event) => setFieldName(event.target.value)} style={{ padding: 6 }} />
        <input value={usernameHint} onChange={(event) => setUsernameHint(event.target.value)} placeholder="Username hint" style={{ padding: 6 }} />
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button type="button" onClick={savePointer} disabled={saving}>
          Save
        </button>
        <button type="button" onClick={revealSecret} disabled={saving}>
          Reveal
        </button>
        <button type="button" onClick={deletePointer} disabled={saving} style={{ color: "#b91c1c" }}>
          Delete
        </button>
      </div>

      {revealedValue !== null ? (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
            {isSecretVisible ? revealedValue : "••••••••••••••••"}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button type="button" onClick={() => setIsSecretVisible((value) => !value)} disabled={saving}>
              {isSecretVisible ? "Mask" : "Show"}
            </button>
            <button type="button" onClick={copySecret} disabled={saving}>
              Copy
            </button>
            <span style={{ color: "#666", fontSize: 12 }}>{copyStatus ?? ""}</span>
          </div>
          <div style={{ color: "#666", fontSize: 12 }}>Revealed value is not persisted or written to ActivityLog.</div>
        </div>
      ) : null}
      {error ? <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
