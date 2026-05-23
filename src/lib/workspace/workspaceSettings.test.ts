import { describe, expect, it } from "vitest";
import {
  DEFAULT_INACTIVITY_REMINDER_INTERVAL_DAYS,
  DEFAULT_INACTIVITY_THRESHOLD_DAYS,
  DEFAULT_INVOICE_CURRENCY,
  DEFAULT_INVOICE_TAX_MODE,
  DEFAULT_RENEWAL_REMINDER_DAYS,
  DEFAULT_TASK_DUE_REMINDER_DAYS,
  getWorkspaceSettingsWithDefaults,
  mergeWorkspaceSettings,
  normalizeReminderDays,
  parseWorkspaceSettingsJson,
} from "./workspaceSettings";

describe("workspaceSettings", () => {
  it("returns hardcoded defaults when parsed is null", () => {
    expect(getWorkspaceSettingsWithDefaults(null)).toEqual({
      v: 1,
      general: {
        defaultRenewalReminderDays: [...DEFAULT_RENEWAL_REMINDER_DAYS],
        defaultTaskDueReminderDays: [...DEFAULT_TASK_DUE_REMINDER_DAYS],
        inactivityThresholdDays: DEFAULT_INACTIVITY_THRESHOLD_DAYS,
        inactivityReminderIntervalDays: DEFAULT_INACTIVITY_REMINDER_INTERVAL_DAYS,
      },
      invoicing: {
        defaultCurrency: DEFAULT_INVOICE_CURRENCY,
        defaultPaymentTerms: null,
        defaultTaxMode: DEFAULT_INVOICE_TAX_MODE,
      },
    });
  });

  it("merges partial general patch", () => {
    const next = mergeWorkspaceSettings(null, {
      general: { inactivityThresholdDays: 45 },
    });
    expect(next.general?.inactivityThresholdDays).toBe(45);
    expect(next.general?.defaultRenewalReminderDays).toEqual([...DEFAULT_RENEWAL_REMINDER_DAYS]);
  });

  it("merges partial invoicing patch", () => {
    const next = mergeWorkspaceSettings(null, {
      invoicing: { defaultCurrency: "EUR", defaultPaymentTerms: "Net 30" },
    });
    expect(next.invoicing?.defaultCurrency).toBe("EUR");
    expect(next.invoicing?.defaultPaymentTerms).toBe("Net 30");
  });

  it("normalizes reminder days", () => {
    expect(normalizeReminderDays([7, 90, 7, 30])).toEqual([90, 30, 7]);
    expect(normalizeReminderDays([])).toEqual([...DEFAULT_RENEWAL_REMINDER_DAYS]);
    expect(normalizeReminderDays([400, -1, 1.5])).toEqual([1]);
  });

  it("parses valid JSON and rejects invalid", () => {
    expect(parseWorkspaceSettingsJson({ v: 1, general: { inactivityThresholdDays: 14 } })).toEqual({
      v: 1,
      general: { inactivityThresholdDays: 14 },
    });
    expect(parseWorkspaceSettingsJson(null)).toBeNull();
    expect(parseWorkspaceSettingsJson({ v: 2 })).toBeNull();
    expect(parseWorkspaceSettingsJson("bad")).toBeNull();
  });
});
