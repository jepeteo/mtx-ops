import { describe, expect, it } from "vitest";
import { renderInvoicePdfBuffer } from "./pdf";

describe("invoice pdf renderer", () => {
  it("renders a non-empty PDF buffer from trusted invoice data", async () => {
    const pdf = await renderInvoicePdfBuffer({
      invoiceNumber: "MTX-2026-0001",
      issueDate: new Date("2026-04-01T00:00:00.000Z"),
      dueDate: new Date("2026-04-10T00:00:00.000Z"),
      currency: "GBP",
      billingRecipient: "Acme Billing",
      billingEmail: "billing@acme.test",
      subtotalMinor: 10000,
      taxMinor: 2000,
      totalMinor: 12000,
      notes: "Thank you.",
      paymentTerms: "Due on receipt",
      lineItems: [
        {
          position: 1,
          description: "Design work",
          quantity: "1",
          unitPriceMinor: 10000,
          taxMode: "uk_vat",
          taxRateBps: 2000,
          lineSubtotalMinor: 10000,
          lineTaxMinor: 2000,
          lineTotalMinor: 12000,
        },
      ],
    });

    expect(pdf.byteLength).toBeGreaterThan(100);
    const header = Buffer.from(pdf).subarray(0, 4).toString("utf8");
    expect(header).toBe("%PDF");
  });
});
