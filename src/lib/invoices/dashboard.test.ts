import { describe, expect, it } from "vitest";
import { computeInvoiceDashboardMetrics } from "./dashboard";
import type { InvoiceRecord } from "@/components/invoices/types";

const base = {
  id: "inv-1",
  clientId: "c1",
  invoiceNumber: "MTX-2026-0001",
  currency: "GBP",
  billingRecipient: null,
  billingEmail: null,
  notes: null,
  paymentTerms: null,
  subtotalMinor: 1000,
  taxMinor: 200,
  totalMinor: 1200,
  amountPaidMinor: 0,
  sentAt: null,
  paidAt: null,
  voidedAt: null,
  issueDate: "2026-04-01T00:00:00.000Z",
  dueDate: "2026-04-10T00:00:00.000Z",
} satisfies Omit<InvoiceRecord, "status" | "computedStatus">;

describe("invoice dashboard metrics", () => {
  it("computes unpaid, overdue, issued, and paid totals", () => {
    const invoices: InvoiceRecord[] = [
      { ...base, id: "a", status: "draft", computedStatus: "draft", totalMinor: 1200, amountPaidMinor: 0 },
      { ...base, id: "b", status: "sent", computedStatus: "overdue", totalMinor: 5000, amountPaidMinor: 0 },
      {
        ...base,
        id: "c",
        status: "paid",
        computedStatus: "paid",
        totalMinor: 7000,
        amountPaidMinor: 7000,
        paidAt: "2026-04-15T00:00:00.000Z",
      },
      {
        ...base,
        id: "d",
        status: "paid",
        computedStatus: "paid",
        issueDate: "2026-03-20T00:00:00.000Z",
        totalMinor: 9000,
        amountPaidMinor: 9000,
        paidAt: "2026-03-20T00:00:00.000Z",
      },
    ];

    const metrics = computeInvoiceDashboardMetrics(invoices, new Date("2026-04-20T00:00:00.000Z"));
    expect(metrics.unpaidCount).toBe(2);
    expect(metrics.overdueCount).toBe(1);
    expect(metrics.revenueIssuedMinor).toBe(1200 + 5000 + 7000);
    expect(metrics.revenuePaidMinor).toBe(7000);
  });
});
