import { describe, expect, it } from "vitest";
import {
  TASK_DUE_REMINDER_DAYS,
  buildInactivityDedupeKey,
  buildRenewalDedupeKey,
  buildTaskDueDedupeKey,
  daysUntil,
  parseReminderRules,
  toUtcDayStart,
} from "./renewals";

describe("notification renewal helpers", () => {
  it("normalizes date to UTC day start", () => {
    const value = new Date("2026-03-01T17:45:00.000Z");
    expect(toUtcDayStart(value).toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("calculates daysUntil using UTC date boundaries", () => {
    const from = new Date("2026-03-01T23:59:59.000Z");
    const to = new Date("2026-03-03T00:00:01.000Z");
    expect(daysUntil(from, to)).toBe(2);
  });

  it("falls back to default reminder rules for invalid input", () => {
    expect(parseReminderRules(null)).toEqual([60, 30, 14, 7]);
    expect(parseReminderRules(["x", -1])).toEqual([60, 30, 14, 7]);
  });

  it("keeps valid integer reminder rules", () => {
    expect(parseReminderRules([90, 30, 7])).toEqual([90, 30, 7]);
  });

  it("builds deterministic dedupe keys", () => {
    const renewalDate = new Date("2026-04-15T09:30:00.000Z");
    expect(buildRenewalDedupeKey("svc_1", 14, renewalDate)).toBe("renewal:svc_1:14:2026-04-15");
    expect(buildInactivityDedupeKey("client_1", new Date("2026-04-15T22:00:00.000Z"))).toBe(
      "inactivity:client_1:2026-04-15",
    );
    expect(buildTaskDueDedupeKey("task_1", 3, renewalDate)).toBe("task:task_1:due-3:2026-04-15");
    expect(buildTaskDueDedupeKey("task_1", -1, renewalDate)).toBe("task:task_1:overdue:2026-04-15");
  });

  it("uses expected default task reminder day buckets", () => {
    expect(TASK_DUE_REMINDER_DAYS).toEqual([7, 3, 1, 0]);
  });
});
