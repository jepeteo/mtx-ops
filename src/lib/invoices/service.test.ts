import { InvoiceStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  assertTransition,
  buildInvoiceTotals,
  reserveInvoiceNumber,
} from "./service";

describe("invoice service helpers", () => {
  it("validates create payload shape", () => {
    const parsed = CreateInvoiceSchema.safeParse({
      clientId: "11111111-1111-4111-8111-111111111111",
      currency: "GBP",
      issueDate: "2026-04-01T00:00:00.000Z",
      dueDate: "2026-04-10T00:00:00.000Z",
      lineItems: [
        {
          description: "Design",
          quantity: "2.5",
          unitPriceMinor: 1000,
          taxMode: "uk_vat",
          taxRateBps: 2000,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects status updates through metadata schema", () => {
    const parsed = UpdateInvoiceSchema.safeParse({
      status: "paid",
      notes: "x",
    });

    expect(parsed.success).toBe(false);
  });

  it("formats number using issue date year from sequence reservation", async () => {
    const upsert = vi.fn().mockResolvedValue({ nextSequence: 2 });
    const invoiceNumber = await reserveInvoiceNumber({
      tx: {
        invoiceSequence: { upsert },
      } as never,
      workspaceId: "ws-1",
      issueDate: new Date("2027-01-01T00:00:00.000Z"),
    });

    expect(invoiceNumber).toBe("MTX-2027-0001");
    expect(upsert).toHaveBeenCalled();
  });

  it("produces unique sequence-based numbers when sequence increments", async () => {
    const upsert = vi
      .fn()
      .mockResolvedValueOnce({ nextSequence: 2 })
      .mockResolvedValueOnce({ nextSequence: 3 });

    const first = await reserveInvoiceNumber({
      tx: { invoiceSequence: { upsert } } as never,
      workspaceId: "ws-1",
      issueDate: new Date("2026-02-01T00:00:00.000Z"),
    });
    const second = await reserveInvoiceNumber({
      tx: { invoiceSequence: { upsert } } as never,
      workspaceId: "ws-1",
      issueDate: new Date("2026-02-01T00:00:00.000Z"),
    });

    expect(first).toBe("MTX-2026-0001");
    expect(second).toBe("MTX-2026-0002");
    expect(first).not.toBe(second);
  });

  it("validates status transitions", () => {
    expect(() => assertTransition(InvoiceStatus.draft, InvoiceStatus.sent)).not.toThrow();
    expect(() => assertTransition(InvoiceStatus.sent, InvoiceStatus.paid)).not.toThrow();
    expect(() => assertTransition(InvoiceStatus.paid, InvoiceStatus.void)).toThrow();
  });

  it("enforces positive total when requested", () => {
    expect(() =>
      buildInvoiceTotals([{ lineSubtotalMinor: 0, lineTaxMinor: 0, lineTotalMinor: 0 }], true),
    ).toThrow("Zero-total invoices are not allowed in V1.");
  });
});
