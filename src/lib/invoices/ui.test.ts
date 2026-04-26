import { describe, expect, it } from "vitest";
import { formatBpsAsPercent, formatMinorCurrency, invoiceStatusTone, parseMajorCurrencyToMinor, parsePercentToBps } from "./ui";

describe("invoice ui helpers", () => {
  it("formats minor units as currency", () => {
    expect(formatMinorCurrency(12345, "GBP")).toContain("123.45");
  });

  it("maps invoice status to tone class", () => {
    expect(invoiceStatusTone("draft")).toContain("info");
    expect(invoiceStatusTone("overdue")).toContain("destructive");
    expect(invoiceStatusTone("paid")).toContain("emerald");
  });

  it("parses major currency strings to minor units", () => {
    expect(parseMajorCurrencyToMinor("10")).toBe(1000);
    expect(parseMajorCurrencyToMinor("10.5")).toBe(1050);
    expect(parseMajorCurrencyToMinor(" 1,234.56 ")).toBe(123456);
    expect(parseMajorCurrencyToMinor("")).toBe(0);
  });

  it("parses percent to basis points", () => {
    expect(parsePercentToBps("20")).toBe(2000);
    expect(parsePercentToBps("5.5")).toBe(550);
  });

  it("formats bps as a percent label", () => {
    expect(formatBpsAsPercent(2000)).toBe("20%");
    expect(formatBpsAsPercent(0)).toBe("—");
  });
});
