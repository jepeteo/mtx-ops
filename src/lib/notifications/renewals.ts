import {
  DEFAULT_INACTIVITY_REMINDER_INTERVAL_DAYS,
  DEFAULT_INACTIVITY_THRESHOLD_DAYS,
  DEFAULT_RENEWAL_REMINDER_DAYS,
} from "@/lib/workspace/workspaceSettings";

export const TASK_DUE_REMINDER_DAYS = [7, 3, 1, 0] as const;
export const INACTIVITY_THRESHOLD_DAYS = DEFAULT_INACTIVITY_THRESHOLD_DAYS;
export const INACTIVITY_REMINDER_INTERVAL_DAYS = DEFAULT_INACTIVITY_REMINDER_INTERVAL_DAYS;

export function toUtcDayStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function daysUntil(fromDate: Date, toDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((toUtcDayStart(toDate).getTime() - toUtcDayStart(fromDate).getTime()) / msPerDay);
}

export function parseReminderRules(value: unknown, defaultRules: number[] = [...DEFAULT_RENEWAL_REMINDER_DAYS]): number[] {
  if (!Array.isArray(value)) return defaultRules;
  const parsed = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0);
  return parsed.length > 0 ? parsed : defaultRules;
}

export function buildRenewalDedupeKey(serviceId: string, remainingDays: number, renewalDate: Date) {
  const dueAtDay = toUtcDayStart(renewalDate).toISOString().slice(0, 10);
  return `renewal:${serviceId}:${remainingDays}:${dueAtDay}`;
}

export function buildInactivityDedupeKey(
  clientId: string,
  inactiveDays: number,
  opts?: { thresholdDays?: number; intervalDays?: number },
) {
  const thresholdDays = opts?.thresholdDays ?? INACTIVITY_THRESHOLD_DAYS;
  const intervalDays = opts?.intervalDays ?? INACTIVITY_REMINDER_INTERVAL_DAYS;
  const normalizedInactiveDays = Math.max(0, Math.trunc(inactiveDays));
  const bucket =
    normalizedInactiveDays < thresholdDays
      ? 0
      : Math.floor((normalizedInactiveDays - thresholdDays) / intervalDays);
  return `inactivity:${clientId}:bucket-${bucket}`;
}

export function buildTaskDueDedupeKey(taskId: string, remainingDays: number, dueAt: Date) {
  const dueAtDay = toUtcDayStart(dueAt).toISOString().slice(0, 10);
  const bucket = remainingDays < 0 ? "overdue" : `due-${remainingDays}`;
  return `task:${taskId}:${bucket}:${dueAtDay}`;
}
