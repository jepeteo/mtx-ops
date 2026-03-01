export const DEFAULT_SERVICE_REMINDER_RULES = [60, 30, 14, 7] as const;

export function normalizeReminderRules(rules: number[]) {
  const normalized = Array.from(new Set(rules.map((value) => Math.trunc(value)))).filter(
    (value) => Number.isInteger(value) && value >= 0 && value <= 365,
  );

  if (normalized.length === 0) {
    return [...DEFAULT_SERVICE_REMINDER_RULES];
  }

  return normalized.sort((left, right) => right - left);
}
