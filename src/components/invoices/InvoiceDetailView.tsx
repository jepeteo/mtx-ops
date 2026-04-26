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
import { formatMinorCurrency } from "@/lib/invoices/ui";

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
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const [newDescription, setNewDescription] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnitPriceMinor, setNewUnitPriceMinor] = useState("0");
  const [newTaxMode, setNewTaxMode] = useState<"uk_vat" | "reverse_charge" | "none">("none");
  const [newTaxRateBps, setNewTaxRateBps] = useState("0");

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
    setNotes(payload.data.invoice.notes ?? "");
    setPaymentTerms(payload.data.invoice.paymentTerms ?? "");
    setLoading(false);
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

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
    const response = await fetch(`/api/invoices/${invoiceId}/line-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: newDescription,
        quantity: newQuantity,
        unitPriceMinor: Number(newUnitPriceMinor),
        taxMode: newTaxMode,
        taxRateBps: Number(newTaxRateBps),
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
    setNewUnitPriceMinor("0");
    setNewTaxMode("none");
    setNewTaxRateBps("0");
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
          <Button type="button" onClick={saveMetadata} disabled={!isDraft || savingMeta}>
            {savingMeta ? "Saving..." : "Save invoice"}
          </Button>
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
                  <th>Unit (minor)</th>
                  <th>Tax mode</th>
                  <th>Tax bps</th>
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
                    <td>{line.unitPriceMinor}</td>
                    <td>{line.taxMode}</td>
                    <td>{line.taxRateBps}</td>
                    <td>{formatMinorCurrency(line.lineTotalMinor, invoice.currency)}</td>
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
            </table>
          </div>
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-5">
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="form-input sm:col-span-2"
              placeholder="Description"
              disabled={!isDraft}
            />
            <input
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="form-input"
              placeholder="Quantity"
              disabled={!isDraft}
            />
            <input
              value={newUnitPriceMinor}
              onChange={(e) => setNewUnitPriceMinor(e.target.value)}
              className="form-input"
              placeholder="Unit (minor)"
              disabled={!isDraft}
            />
            <div className="grid gap-2 sm:grid-cols-2 sm:col-span-5">
              <select
                value={newTaxMode}
                onChange={(e) => setNewTaxMode(e.target.value as "uk_vat" | "reverse_charge" | "none")}
                className="form-select"
                disabled={!isDraft}
              >
                <option value="none">none</option>
                <option value="uk_vat">uk_vat</option>
                <option value="reverse_charge">reverse_charge</option>
              </select>
              <input
                value={newTaxRateBps}
                onChange={(e) => setNewTaxRateBps(e.target.value)}
                className="form-input"
                placeholder="Tax bps"
                disabled={!isDraft}
              />
            </div>
            <Button type="button" onClick={createLineItem} disabled={!isDraft || savingLine}>
              {savingLine ? "Saving..." : "Add line item"}
            </Button>
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
