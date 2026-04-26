import { describe, expect, it } from "vitest";
import { formatMinorCurrency, invoiceStatusTone } from "./ui";

describe("invoice ui helpers", () => {
  it("formats minor units as currency", () => {
    expect(formatMinorCurrency(12345, "GBP")).toContain("123.45");
  });

  it("maps invoice status to tone class", () => {
    expect(invoiceStatusTone("draft")).toContain("info");
    expect(invoiceStatusTone("overdue")).toContain("destructive");
    expect(invoiceStatusTone("paid")).toContain("emerald");
  });
});
