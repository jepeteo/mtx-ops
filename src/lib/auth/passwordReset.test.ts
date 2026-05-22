import { describe, expect, it } from "vitest";
import {
  buildPasswordResetUrl,
  createPasswordResetTokenValue,
  hashPasswordResetToken,
  normalizeAuthEmail,
} from "./passwordReset";

describe("passwordReset", () => {
  it("normalizes email to lowercase", () => {
    expect(normalizeAuthEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("hashes tokens deterministically", () => {
    const token = "sample-token-value";
    expect(hashPasswordResetToken(token)).toHaveLength(64);
    expect(hashPasswordResetToken(token)).toBe(hashPasswordResetToken(token));
  });

  it("creates unique token values", () => {
    const a = createPasswordResetTokenValue();
    const b = createPasswordResetTokenValue();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("builds reset URL with encoded token", () => {
    const url = buildPasswordResetUrl("https://ops.example.com/", "abc+def/token");
    expect(url).toBe("https://ops.example.com/reset-password?token=abc%2Bdef%2Ftoken");
  });
});
