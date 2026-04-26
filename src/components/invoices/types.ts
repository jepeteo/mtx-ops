export type ApiEnvelope<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: { code: string; message: string; details?: unknown; requestId: string } };

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type InvoiceComputedStatus = InvoiceStatus | "overdue";

export type InvoiceLineItem = {
  id: string;
  invoiceId: string;
  position: number;
  description: string;
  quantity: string;
  unitPriceMinor: number;
  taxMode: "uk_vat" | "reverse_charge" | "none";
  taxRateBps: number;
  lineSubtotalMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
};

export type InvoiceRecord = {
  id: string;
  clientId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  computedStatus: InvoiceComputedStatus;
  currency: string;
  issueDate: string;
  dueDate: string;
  billingRecipient: string | null;
  billingEmail: string | null;
  notes: string | null;
  paymentTerms: string | null;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  sentAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  client?: { id: string; name: string };
  lineItems?: InvoiceLineItem[];
  lineItemsCount?: number;
};
