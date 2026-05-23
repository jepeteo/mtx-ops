"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormFieldInput } from "@/components/ui/form-field";
import { useWorkspaceSettings } from "./WorkspaceSettingsShell";

type ApiOk<T> = { ok: true; data: T; requestId: string };
type ApiErr = { ok: false; error: { message: string } };

const TAX_MODES = [
  { value: "none", label: "None" },
  { value: "uk_vat", label: "UK VAT" },
  { value: "reverse_charge", label: "Reverse charge" },
] as const;

export function WorkspaceInvoicingDefaultsForm() {
  const router = useRouter();
  const { loading, error, data, applyPayload } = useWorkspaceSettings();
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState("GBP");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [taxMode, setTaxMode] = useState<"uk_vat" | "reverse_charge" | "none">("none");

  useEffect(() => {
    if (!data) return;
    setCurrency(data.settings.invoicing.defaultCurrency);
    setPaymentTerms(data.settings.invoicing.defaultPaymentTerms ?? "");
    setTaxMode(data.settings.invoicing.defaultTaxMode);
  }, [data]);

  async function save() {
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      toast.error("Currency must be a 3-letter ISO 4217 code.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/workspace/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        settings: {
          invoicing: {
            defaultCurrency: normalizedCurrency,
            defaultPaymentTerms: paymentTerms.trim() || null,
            defaultTaxMode: taxMode,
          },
        },
      }),
    });
    const body = (await res.json().catch(() => null)) as ApiOk<NonNullable<typeof data>> | ApiErr | null;
    setSaving(false);

    if (!res.ok || !body || !body.ok) {
      toast.error(body && !body.ok ? body.error.message : "Save failed");
      return;
    }

    applyPayload(body.data);
    toast.success("Invoicing defaults saved.");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading invoicing defaults…</p>;
  }

  if (error) {
    return <p className="text-sm font-medium text-destructive">{error}</p>;
  }

  return (
    <div className="grid max-w-2xl gap-4 rounded-lg border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice defaults</div>
      <p className="text-sm text-muted-foreground">Applied when creating new invoice drafts and new line items.</p>

      <FormFieldInput
        id="default-currency"
        label="Default currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        maxLength={3}
      />
      <FormFieldInput
        id="default-payment-terms"
        label="Default payment terms"
        value={paymentTerms}
        onChange={(e) => setPaymentTerms(e.target.value)}
        placeholder="e.g. Net 30"
      />
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Default tax mode (new line items)</span>
        <select className="form-input" value={taxMode} onChange={(e) => setTaxMode(e.target.value as typeof taxMode)}>
          {TAX_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save invoicing defaults"}
        </Button>
      </div>
    </div>
  );
}
