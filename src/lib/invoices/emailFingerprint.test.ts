import { describe, expect, it } from "vitest";
import { computeInvoiceEmailRequestFingerprint } from "./emailFingerprint";

describe("computeInvoiceEmailRequestFingerprint", () => {
  it("is stable for same invoice and email", () => {
    const a = computeInvoiceEmailRequestFingerprint("uuid-1", "Client@Example.com");
    const b = computeInvoiceEmailRequestFingerprint("uuid-1", "  client@example.com  ");
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });

  it("differs when recipient changes", () => {
    const a = computeInvoiceEmailRequestFingerprint("uuid-1", "a@b.com");
    const b = computeInvoiceEmailRequestFingerprint("uuid-1", "b@b.com");
    expect(a).not.toBe(b);
  });
});
