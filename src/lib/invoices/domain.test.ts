import { InvoiceStatus, InvoiceTaxMode, Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotals,
  calculateLineTotals,
  canTransitionInvoiceStatus,
  computeInvoiceStatus,
  computeTaxMinor,
  formatInvoiceNumber,
} from "./domain";

describe("invoice domain helpers", () => {
  it("calculates uk_vat tax in basis points", () => {
    expect(computeTaxMinor(10_000, InvoiceTaxMode.uk_vat, 2_000)).toBe(2_000);
  });

  it("returns zero tax for reverse_charge and none", () => {
    expect(computeTaxMinor(10_000, InvoiceTaxMode.reverse_charge, 2_000)).toBe(0);
    expect(computeTaxMinor(10_000, InvoiceTaxMode.none, 2_000)).toBe(0);
  });

  it("calculates line totals using Prisma.Decimal quantity", () => {
    const line = calculateLineTotals({
      quantity: new Prisma.Decimal("2.5"),
      unitPriceMinor: 1_200,
      taxMode: InvoiceTaxMode.uk_vat,
      taxRateBps: 2_000,
    });

    expect(line).toEqual({
      lineSubtotalMinor: 3_000,
      lineTaxMinor: 600,
      lineTotalMinor: 3_600,
    });
  });

  it("aggregates invoice totals and can reject zero-total invoices", () => {
    const totals = calculateInvoiceTotals([
      { lineSubtotalMinor: 3_000, lineTaxMinor: 600, lineTotalMinor: 3_600 },
      { lineSubtotalMinor: 2_000, lineTaxMinor: 0, lineTotalMinor: 2_000 },
    ]);

    expect(totals).toEqual({
      subtotalMinor: 5_000,
      taxMinor: 600,
      totalMinor: 5_600,
    });

    expect(calculateInvoiceTotals([{ lineSubtotalMinor: 0, lineTaxMinor: 0, lineTotalMinor: 0 }])).toEqual({
      subtotalMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    });

    expect(() =>
      calculateInvoiceTotals([{ lineSubtotalMinor: 0, lineTaxMinor: 0, lineTotalMinor: 0 }], { requirePositiveTotal: true }),
    ).toThrow("Zero-total invoices are not allowed in V1.");
  });

  it("computes overdue from persisted sent status and due date", () => {
    const now = new Date("2026-04-25T10:00:00.000Z");
    expect(computeInvoiceStatus(InvoiceStatus.sent, new Date("2026-04-24T00:00:00.000Z"), now)).toBe(
      "overdue",
    );
    expect(computeInvoiceStatus(InvoiceStatus.sent, new Date("2026-04-26T00:00:00.000Z"), now)).toBe(
      InvoiceStatus.sent,
    );
    expect(computeInvoiceStatus(InvoiceStatus.paid, new Date("2026-01-01T00:00:00.000Z"), now)).toBe(
      InvoiceStatus.paid,
    );
  });

  it("formats invoice number from issue date year", () => {
    expect(formatInvoiceNumber(new Date("2026-01-02T00:00:00.000Z"), 1)).toBe("MTX-2026-0001");
    expect(formatInvoiceNumber(new Date("2027-12-31T00:00:00.000Z"), 53)).toBe("MTX-2027-0053");
  });

  it("validates allowed status transitions", () => {
    expect(canTransitionInvoiceStatus(InvoiceStatus.draft, InvoiceStatus.sent)).toBe(true);
    expect(canTransitionInvoiceStatus(InvoiceStatus.draft, InvoiceStatus.void)).toBe(true);
    expect(canTransitionInvoiceStatus(InvoiceStatus.sent, InvoiceStatus.paid)).toBe(true);
    expect(canTransitionInvoiceStatus(InvoiceStatus.sent, InvoiceStatus.void)).toBe(true);
    expect(canTransitionInvoiceStatus(InvoiceStatus.paid, InvoiceStatus.void)).toBe(false);
    expect(canTransitionInvoiceStatus(InvoiceStatus.void, InvoiceStatus.sent)).toBe(false);
  });
});
