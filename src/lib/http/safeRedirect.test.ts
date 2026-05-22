import { describe, expect, it } from "vitest";
import { safeAppRedirectPath } from "./safeRedirect";

describe("safeAppRedirectPath", () => {
  it("allows app-relative paths", () => {
    expect(safeAppRedirectPath("/app/clients")).toBe("/app/clients");
  });

  it("rejects external and protocol-relative paths", () => {
    expect(safeAppRedirectPath("https://evil.test")).toBe("/app");
    expect(safeAppRedirectPath("//evil.test")).toBe("/app");
    expect(safeAppRedirectPath("/login")).toBe("/app");
  });
});
