"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { ConfirmInvoiceActionDialog } from "./ConfirmInvoiceActionDialog";
import type { ApiEnvelope, InvoiceLineItem, InvoiceRecord } from "./types";
import {
  formatBpsAsPercent,
  formatMinorCurrency,
  parseMajorCurrencyToMinor,
  parsePercentToBps,
} from "@/lib/invoices/ui";

function taxModeLabel(mode: InvoiceLineItem["taxMode"]) {
  if (mode === "none") return "No VAT";
  if (mode === "uk_vat") return "UK VAT";
  if (mode === "reverse_charge") return "Reverse charge";
  return mode;
}

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export function InvoiceDetailView({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingLine, setSavingLine] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendIdempotencyKey, setSendIdempotencyKey] = useState("");
  const [sendEmailLoading, setSendEmailLoading] = useState(false);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false);

  const [currency, setCurrency] = useState("GBP");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [billingRecipient, setBillingRecipient] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingVatId, setBillingVatId] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const [newDescription, setNewDescription] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnitPriceMajor, setNewUnitPriceMajor] = useState("");
  const [newTaxMode, setNewTaxMode] = useState<"uk_vat" | "reverse_charge" | "none">("none");
  const [newTaxPercent, setNewTaxPercent] = useState("0");

  const isDraft = invoice?.status === "draft";
  const isVoid = invoice?.status === "void";
  const canSendEmail = invoice && !isVoid;

  async function loadDetail() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/invoices/${invoiceId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<{ invoice: InvoiceRecord }>
      | null;
    if (!response.ok || !payload || !payload.ok) {
      setError(payload && !payload.ok ? payload.error.message : "Failed to load invoice");
      setInvoice(null);
      setLoading(false);
      return;
    }
    setInvoice(payload.data.invoice);
    setCurrency(payload.data.invoice.currency);
    setIssueDate(payload.data.invoice.issueDate.slice(0, 10));
    setDueDate(payload.data.invoice.dueDate.slice(0, 10));
    setBillingRecipient(payload.data.invoice.billingRecipient ?? "");
    setBillingEmail(payload.data.invoice.billingEmail ?? "");
    setBillingAddress(payload.data.invoice.billingAddress ?? "");
    setBillingVatId(payload.data.invoice.billingVatId ?? "");
    setNotes(payload.data.invoice.notes ?? "");
    setPaymentTerms(payload.data.invoice.paymentTerms ?? "");
    setLoading(false);
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/workspace/settings", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as
        | {
            ok: true;
            data: { settings: { invoicing: { defaultTaxMode: "uk_vat" | "reverse_charge" | "none" } } };
          }
        | { ok: false }
        | null;
      if (cancelled || !res.ok || !body || !body.ok) return;
      setNewTaxMode(body.data.settings.invoicing.defaultTaxMode);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sendEmailOpen) {
      setSendIdempotencyKey(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `idem-${Date.now()}`);
      setSendTo(billingEmail || "");
      setSendEmailError(null);
      setSendEmailSuccess(false);
    }
  }, [sendEmailOpen, billingEmail]);

  useEffect(() => {
    if (!sendEmailSuccess) return;
    const t = setTimeout(() => setSendEmailSuccess(false), 6000);
    return () => clearTimeout(t);
  }, [sendEmailSuccess]);

  const lineItems = useMemo(() => invoice?.lineItems ?? [], [invoice?.lineItems]);

  function resetBillingFromClient() {
    const c = invoice?.client;
    if (!c || !isDraft) return;
    setBillingRecipient((c.billingRecipient && c.billingRecipient.trim()) || c.name || "");
    setBillingEmail(c.billingEmail ?? "");
    setBillingAddress(c.billingAddress ?? "");
    setBillingVatId(c.billingVatId ?? "");
  }

  async function saveMetadata() {
    if (!invoice || !isDraft) return;
    setSavingMeta(true);
    setError(null);
    const response = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currency: currency.toUpperCase(),
        issueDate: toIsoDate(issueDate),
        dueDate: toIsoDate(dueDate),
        billingRecipient: billingRecipient || null,
        billingEmail: billingEmail || null,
        billingAddress: billingAddress || null,
        billingVatId: billingVatId || null,
        notes: notes || null,
        paymentTerms: paymentTerms || null,
      }),
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ invoice: InvoiceRecord }> | null;
    if (!response.ok || !payload || !payload.ok) {
      setSavingMeta(false);
      setError(payload && !payload.ok ? payload.error.message : "Failed to save invoice");
      return;
    }
    setInvoice(payload.data.invoice);
    setSavingMeta(false);
    router.refresh();
  }

  async function createLineItem() {
    if (!invoice) return;
    setSavingLine(true);
    setError(null);
    const unitPriceMinor = parseMajorCurrencyToMinor(newUnitPriceMajor);
    const taxRateBps = newTaxMode === "uk_vat" ? parsePercentToBps(newTaxPercent) : 0;
    const response = await fetch(`/api/invoices/${invoiceId}/line-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: newDescription,
        quantity: newQuantity,
        unitPriceMinor,
        taxMode: newTaxMode,
        taxRateBps,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<{ invoice: InvoiceRecord }>
      | null;
    if (!response.ok || !payload || !payload.ok) {
      setSavingLine(false);
      setError(payload && !payload.ok ? payload.error.message : "Failed to create line item");
      return;
    }
    setInvoice(payload.data.invoice);
    setNewDescription("");
    setNewQuantity("1");
    setNewUnitPriceMajor("");
    setNewTaxMode("none");
    setNewTaxPercent("0");
    setSavingLine(false);
  }

  async function updateLineItem(line: InvoiceLineItem, patch: Partial<InvoiceLineItem>) {
    setSavingLine(true);
    setError(null);
    const response = await fetch(`/api/invoice-line-items/${line.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<{ invoice: InvoiceRecord }>
      | null;
    if (!response.ok || !payload || !payload.ok) {
      setSavingLine(false);
      setError(payload && !payload.ok ? payload.error.message : "Failed to update line item");
      return;
    }
    setInvoice(payload.data.invoice);
    setSavingLine(false);
  }

  async function deleteLineItem(lineId: string) {
    setSavingLine(true);
    setError(null);
    const response = await fetch(`/api/invoice-line-items/${lineId}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<{ invoice: InvoiceRecord }>
      | null;
    if (!response.ok || !payload || !payload.ok) {
      setSavingLine(false);
      setError(payload && !payload.ok ? payload.error.message : "Failed to delete line item");
      return;
    }
    setInvoice(payload.data.invoice);
    setSavingLine(false);
  }

  async function performTransition(endpoint: "mark-sent" | "mark-paid" | "mark-void") {
    const response = await fetch(`/api/invoices/${invoiceId}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<{ invoice: InvoiceRecord }>
      | null;
    if (!response.ok || !payload || !payload.ok) {
      throw new Error(payload && !payload.ok ? payload.error.message : "Transition failed");
    }
    setInvoice(payload.data.invoice);
    router.refresh();
  }

  async function downloadPdf() {
    setDownloadingPdf(true);
    setError(null);
    const response = await fetch(`/api/invoices/${invoiceId}/pdf`, { method: "GET" });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
      setDownloadingPdf(false);
      setError(payload && !payload.ok ? payload.error.message : "Failed to download PDF");
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/pdf")) {
      setDownloadingPdf(false);
      setError("Unexpected response while downloading PDF");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const fileName = `${invoice?.invoiceNumber ?? "invoice"}.pdf`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setDownloadingPdf(false);
  }

  async function sendInvoiceEmail() {
    if (!sendTo.trim()) {
      setSendEmailError("Recipient email is required");
      return;
    }
    setSendEmailLoading(true);
    setSendEmailError(null);
    const response = await fetch(`/api/invoices/${invoiceId}/send-email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": sendIdempotencyKey,
      },
      body: JSON.stringify({ recipientEmail: sendTo.trim() }),
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ invoice: InvoiceRecord; email: { idempotentReplay: boolean } }> | null;
    if (!response.ok || !payload || !payload.ok) {
      setSendEmailLoading(false);
      setSendEmailError(payload && !payload.ok ? payload.error.message : "Failed to send email");
      return;
    }
    setInvoice(payload.data.invoice);
    setSendEmailSuccess(true);
    setSendEmailLoading(false);
    setSendEmailOpen(false);
    router.refresh();
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-destructive">
          {error ?? "Invoice not found"}
        </div>
        <Link href="/app/invoices" className="text-sm text-primary hover:underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sendEmailSuccess ? (
        <div className="rounded-md border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100">
          Invoice email was sent successfully.
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/app/invoices" className="text-xs text-muted-foreground hover:text-foreground">
            Back to invoices
          </Link>
          <h1 className="mt-1 text-lg font-semibold">{invoice.invoiceNumber}</h1>
          <p className="text-xs text-muted-foreground">{invoice.client?.name ?? "Unknown client"}</p>
        </div>
        <InvoiceStatusBadge status={invoice.computedStatus} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Invoice details</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={downloadPdf} disabled={downloadingPdf}>
              {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canSendEmail}
              onClick={() => setSendEmailOpen(true)}
              title={isVoid ? "Cannot email a void invoice" : undefined}
            >
              Send invoice email
            </Button>
            <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
              <DialogContent className="max-w-md">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Send invoice by email</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sends invoice {invoice.invoiceNumber} as a PDF attachment using your configured sender (Resend). You can change the recipient
                      address for this send only.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="send-invoice-email">
                      Recipient email
                    </label>
                    <input
                      id="send-invoice-email"
                      type="email"
                      className="form-input"
                      value={sendTo}
                      onChange={(e) => setSendTo(e.target.value)}
                      placeholder="billing@client.com"
                      autoComplete="email"
                    />
                  </div>
                  {sendEmailError ? <div className="text-xs font-medium text-destructive">{sendEmailError}</div> : null}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSendEmailOpen(false)} disabled={sendEmailLoading}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={sendInvoiceEmail} disabled={sendEmailLoading}>
                      {sendEmailLoading ? "Sending..." : "Send email"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <ConfirmInvoiceActionDialog
              triggerLabel="Mark sent"
              title="Mark invoice as sent"
              message="This will lock financial editing and move invoice to sent."
              confirmLabel="Mark sent"
              disabled={!isDraft}
              onConfirm={() => performTransition("mark-sent")}
            />
            <ConfirmInvoiceActionDialog
              triggerLabel="Mark paid"
              title="Mark invoice as paid"
              message="Use this when payment has been confirmed."
              confirmLabel="Mark paid"
              disabled={invoice.status !== "sent"}
              onConfirm={() => performTransition("mark-paid")}
            />
            <ConfirmInvoiceActionDialog
              triggerLabel="Mark void"
              title="Void invoice"
              message="This action marks the invoice as void."
              confirmLabel="Void invoice"
              confirmVariant="destructive"
              disabled={invoice.status === "void" || invoice.status === "paid"}
              onConfirm={() => performTransition("mark-void")}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="form-input" disabled={!isDraft} />
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="form-input" disabled={!isDraft} />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="form-input" disabled={!isDraft} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={billingRecipient}
              onChange={(e) => setBillingRecipient(e.target.value)}
              placeholder="Billing recipient"
              className="form-input"
              disabled={!isDraft}
            />
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="Billing email"
              className="form-input"
              disabled={!isDraft}
            />
          </div>
          <textarea
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            placeholder="Billing address"
            className="form-input min-h-[72px]"
            disabled={!isDraft}
          />
          <input
            value={billingVatId}
            onChange={(e) => setBillingVatId(e.target.value)}
            placeholder="Client VAT / tax ID"
            className="form-input"
            disabled={!isDraft}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="form-input min-h-[80px]"
            disabled={!isDraft}
          />
          <input
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="Payment terms"
            className="form-input"
            disabled={!isDraft}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={saveMetadata} disabled={!isDraft || savingMeta}>
              {savingMeta ? "Saving..." : "Save invoice"}
            </Button>
            {isDraft && invoice.client ? (
              <Button type="button" variant="outline" size="sm" onClick={resetBillingFromClient}>
                Reset from client profile
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Tax</th>
                  <th>VAT %</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((line) => (
                  <tr key={line.id}>
                    <td>{line.position}</td>
                    <td>{line.description}</td>
                    <td>{line.quantity}</td>
                    <td className="tabular-nums">{formatMinorCurrency(line.unitPriceMinor, invoice.currency)}</td>
                    <td>{taxModeLabel(line.taxMode)}</td>
                    <td className="tabular-nums">{formatBpsAsPercent(line.taxRateBps)}</td>
                    <td className="tabular-nums">{formatMinorCurrency(line.lineTotalMinor, invoice.currency)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isDraft || savingLine}
                          onClick={() => {
                            const description = window.prompt("Description", line.description);
                            if (!description) return;
                            updateLineItem(line, { description });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isDraft || savingLine}
                          onClick={() => {
                            const confirmed = window.confirm("Delete this line item?");
                            if (!confirmed) return;
                            deleteLineItem(line.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {lineItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      No line items yet.
                    </td>
                  </tr>
                )}
              </tbody>
              {isDraft ? (
                <tfoot>
                  <tr className="border-t border-border bg-secondary/20 hover:bg-secondary/20">
                    <td className="align-middle text-xs text-muted-foreground">New</td>
                    <td className="align-middle">
                      <input
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="form-input w-full min-w-[10rem]"
                        placeholder="Description"
                        aria-label="New line description"
                      />
                    </td>
                    <td className="align-middle">
                      <input
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className="form-input w-full min-w-[4rem] tabular-nums"
                        placeholder="Qty"
                        inputMode="decimal"
                        aria-label="Quantity"
                      />
                    </td>
                    <td className="align-middle">
                      <input
                        value={newUnitPriceMajor}
                        onChange={(e) => setNewUnitPriceMajor(e.target.value)}
                        className="form-input w-full min-w-[5rem] tabular-nums"
                        placeholder={`e.g. 250.00 (${invoice.currency})`}
                        inputMode="decimal"
                        aria-label="Unit price"
                      />
                    </td>
                    <td className="align-middle">
                      <select
                        value={newTaxMode}
                        onChange={(e) => {
                          const v = e.target.value as "uk_vat" | "reverse_charge" | "none";
                          setNewTaxMode(v);
                          if (v === "uk_vat") {
                            setNewTaxPercent((p) => (p === "0" || p === "" ? "20" : p));
                          } else {
                            setNewTaxPercent("0");
                          }
                        }}
                        className="form-select w-full min-w-[7rem] text-xs"
                        aria-label="Tax treatment"
                      >
                        <option value="none">No VAT</option>
                        <option value="uk_vat">UK VAT</option>
                        <option value="reverse_charge">Reverse charge</option>
                      </select>
                    </td>
                    <td className="align-middle">
                      <input
                        value={newTaxPercent}
                        onChange={(e) => setNewTaxPercent(e.target.value)}
                        className="form-input w-full min-w-[3.5rem] tabular-nums disabled:opacity-50"
                        placeholder="20"
                        inputMode="decimal"
                        disabled={newTaxMode !== "uk_vat"}
                        aria-label="VAT percent"
                        title="Standard UK VAT is 20%. Only used when tax is UK VAT."
                      />
                    </td>
                    <td className="align-middle text-xs text-muted-foreground">—</td>
                    <td className="align-middle">
                      <Button type="button" size="sm" onClick={createLineItem} disabled={savingLine}>
                        {savingLine ? "Saving..." : "Add"}
                      </Button>
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMinorCurrency(invoice.subtotalMinor, invoice.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatMinorCurrency(invoice.taxMinor, invoice.currency)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{formatMinorCurrency(invoice.totalMinor, invoice.currency)}</span>
          </div>
        </CardContent>
      </Card>

      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
    </div>
  );
}
