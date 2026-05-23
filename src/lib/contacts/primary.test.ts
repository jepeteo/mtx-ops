import { describe, expect, it } from "vitest";
import {
  primaryContactPatchData,
  shouldClearOtherPrimaries,
  validatePrimaryDeleteWithTotal,
} from "./primary";

describe("contact primary rules", () => {
  it("clears other primaries only when setting isPrimary true", () => {
    expect(shouldClearOtherPrimaries(true)).toBe(true);
    expect(shouldClearOtherPrimaries(false)).toBe(false);
    expect(shouldClearOtherPrimaries(undefined)).toBe(false);
  });

  it("includes isPrimary in patch only when provided", () => {
    expect(primaryContactPatchData(true)).toEqual({ isPrimary: true });
    expect(primaryContactPatchData(false)).toEqual({ isPrimary: false });
    expect(primaryContactPatchData(undefined)).toEqual({});
  });

  it("blocks deleting the only primary contact on a client", () => {
    expect(validatePrimaryDeleteWithTotal({ isPrimary: true }, 1)).toMatch(/only contact/i);
    expect(validatePrimaryDeleteWithTotal({ isPrimary: true }, 2)).toBeNull();
    expect(validatePrimaryDeleteWithTotal({ isPrimary: false }, 1)).toBeNull();
  });
});
