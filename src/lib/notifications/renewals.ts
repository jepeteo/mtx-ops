const DEFAULT_RULES = [60, 30, 14, 7];
export const TASK_DUE_REMINDER_DAYS = [7, 3, 1, 0] as const;

export function toUtcDayStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function daysUntil(fromDate: Date, toDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((toUtcDayStart(toDate).getTime() - toUtcDayStart(fromDate).getTime()) / msPerDay);
}

export function parseReminderRules(value: unknown): number[] {
  if (!Array.isArray(value)) return DEFAULT_RULES;
  const parsed = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0);
  return parsed.length > 0 ? parsed : DEFAULT_RULES;
}

export function buildRenewalDedupeKey(serviceId: string, remainingDays: number, renewalDate: Date) {
  const dueAtDay = toUtcDayStart(renewalDate).toISOString().slice(0, 10);
  return `renewal:${serviceId}:${remainingDays}:${dueAtDay}`;
}

export function buildInactivityDedupeKey(clientId: string, now: Date) {
  const dedupeDay = toUtcDayStart(now).toISOString().slice(0, 10);
  return `inactivity:${clientId}:${dedupeDay}`;
}

export function buildTaskDueDedupeKey(taskId: string, remainingDays: number, dueAt: Date) {
  const dueAtDay = toUtcDayStart(dueAt).toISOString().slice(0, 10);
  const bucket = remainingDays < 0 ? "overdue" : `due-${remainingDays}`;
  return `task:${taskId}:${bucket}:${dueAtDay}`;
}
