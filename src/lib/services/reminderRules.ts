import { DEFAULT_RENEWAL_REMINDER_DAYS, normalizeReminderDays } from "@/lib/workspace/workspaceSettings";

export const DEFAULT_SERVICE_REMINDER_RULES = DEFAULT_RENEWAL_REMINDER_DAYS;

export function normalizeReminderRules(rules: number[]) {
  return normalizeReminderDays(rules);
}
