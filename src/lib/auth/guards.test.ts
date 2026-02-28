import { describe, expect, it } from "vitest";
import { hasMinRole } from "./guards";

describe("guards role ordering", () => {
  it("allows owner for admin and member minimum roles", () => {
    expect(hasMinRole("OWNER", "ADMIN")).toBe(true);
    expect(hasMinRole("OWNER", "MEMBER")).toBe(true);
  });

  it("allows admin for member minimum role", () => {
    expect(hasMinRole("ADMIN", "MEMBER")).toBe(true);
  });

  it("denies member for admin minimum role", () => {
    expect(hasMinRole("MEMBER", "ADMIN")).toBe(false);
  });
});
