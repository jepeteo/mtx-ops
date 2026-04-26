"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UploadAttachmentForm } from "@/components/attachments/UploadAttachmentForm";
import type { InvoiceIssuerV1 } from "@/lib/workspace/invoiceIssuer";

type ApiOk<T> = { ok: true; data: T; requestId: string };
type ApiErr = { ok: false; error: { message: string } };

export function InvoiceIssuerSettingsForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [addressText, setAddressText] = useState("");
  const [vatId, setVatId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [payAccount, setPayAccount] = useState("");
  const [payIban, setPayIban] = useState("");
  const [payBic, setPayBic] = useState("");
  const [payBank, setPayBank] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const hydrate = useCallback((issuer: InvoiceIssuerV1 | null) => {
    if (!issuer) {
      setLegalName("");
      setAddressText("");
      setVatId("");
      setEmail("");
      setPhone("");
      setLogoUrl("");
      setPayAccount("");
      setPayIban("");
      setPayBic("");
      setPayBank("");
      setPayRef("");
      setPayNotes("");
      return;
    }
    setLegalName(issuer.legalName ?? "");
    setAddressText((issuer.addressLines ?? []).join("\n"));
    setVatId(issuer.vatId ?? "");
    setEmail(issuer.email ?? "");
    setPhone(issuer.phone ?? "");
    setLogoUrl(issuer.logoUrl ?? "");
    const p = issuer.payment;
    setPayAccount(p?.accountName ?? "");
    setPayIban(p?.iban ?? "");
    setPayBic(p?.bic ?? "");
    setPayBank(p?.bankName ?? "");
    setPayRef(p?.referenceHint ?? "");
    setPayNotes(p?.notes ?? "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/workspace/invoice-issuer", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as ApiOk<{ invoiceIssuer: InvoiceIssuerV1 | null }> | ApiErr | null;
      if (cancelled) return;
      if (!res.ok || !body || !("ok" in body) || !body.ok) {
        setError(body && "error" in body ? body.error.message : "Failed to load settings");
        setLoading(false);
        return;
      }
      hydrate(body.data.invoiceIssuer);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const addressLines = addressText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const res = await fetch("/api/workspace/invoice-issuer", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        legalName: legalName.trim() || null,
        addressLines: addressLines.length ? addressLines : [],
        vatId: vatId.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        logoUrl: logoUrl.trim() || null,
        payment: {
          accountName: payAccount.trim() || null,
          iban: payIban.trim() || null,
          bic: payBic.trim() || null,
          bankName: payBank.trim() || null,
          referenceHint: payRef.trim() || null,
          notes: payNotes.trim() || null,
        },
      }),
    });
    const body = (await res.json().catch(() => null)) as ApiOk<{ invoiceIssuer: InvoiceIssuerV1 }> | ApiErr | null;
    setSaving(false);
    if (!res.ok || !body || !("ok" in body) || !body.ok) {
      setError(body && "error" in body ? body.error.message : "Save failed");
      return;
    }
    hydrate(body.data.invoiceIssuer);
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 4000);
  }

  async function applyLogoUrl(url: string | null) {
    if (!url) {
      setError("Public URL not available. Configure STORAGE_PUBLIC_BASE_URL (or equivalent) so uploaded files have a reachable HTTPS URL.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/workspace/invoice-issuer", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logoUrl: url }),
    });
    const body = (await res.json().catch(() => null)) as ApiOk<{ invoiceIssuer: InvoiceIssuerV1 }> | ApiErr | null;
    setSaving(false);
    if (!res.ok || !body || !("ok" in body) || !body.ok) {
      setError(body && "error" in body ? body.error.message : "Failed to set logo URL");
      return;
    }
    setLogoUrl(body.data.invoiceIssuer.logoUrl ?? "");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading invoice settings…</p>;
  }

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company / issuer</div>
        <input className="form-input" placeholder="Legal name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        <textarea
          className="form-textarea"
          rows={4}
          placeholder="Address (one line per row)"
          value={addressText}
          onChange={(e) => setAddressText(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="form-input" placeholder="VAT / tax ID" value={vatId} onChange={(e) => setVatId(e.target.value)} />
          <input className="form-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="form-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="form-input" placeholder="Logo image URL (HTTPS)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo upload</div>
        <p className="text-xs text-muted-foreground">
          Upload attaches to this workspace. After upload, the public URL is saved as the invoice logo when your storage exposes HTTPS URLs.
        </p>
        <UploadAttachmentForm
          entityType="Workspace"
          entityId={workspaceId}
          onAttachmentLinked={({ publicUrl }) => {
            void applyLogoUrl(publicUrl);
          }}
        />
      </div>

      <div className="grid gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bank / payment</div>
        <input className="form-input" placeholder="Account name" value={payAccount} onChange={(e) => setPayAccount(e.target.value)} />
        <input className="form-input" placeholder="IBAN" value={payIban} onChange={(e) => setPayIban(e.target.value)} />
        <input className="form-input" placeholder="BIC / SWIFT" value={payBic} onChange={(e) => setPayBic(e.target.value)} />
        <input className="form-input" placeholder="Bank name" value={payBank} onChange={(e) => setPayBank(e.target.value)} />
        <input className="form-input" placeholder="Payment reference hint" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
        <textarea className="form-textarea" rows={2} placeholder="Extra payment notes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        {success ? <span className="text-xs font-medium text-emerald-600">Saved.</span> : null}
      </div>
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </div>
  );
}
