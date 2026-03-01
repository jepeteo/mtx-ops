import { describe, expect, it } from "vitest";
import { DEFAULT_SERVICE_REMINDER_RULES, normalizeReminderRules } from "./reminderRules";

describe("service reminder rules", () => {
  it("normalizes, deduplicates, and sorts descending", () => {
    expect(normalizeReminderRules([7, 30, 7, 14, 1])).toEqual([30, 14, 7, 1]);
  });

  it("drops invalid values and falls back to defaults", () => {
    expect(normalizeReminderRules([-1, 366, Number.NaN])).toEqual([...DEFAULT_SERVICE_REMINDER_RULES]);
  });
});
