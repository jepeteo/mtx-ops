# Skill: Notifications Engine (Renewals + Due Dates + Inactivity)

## Purpose
Generate in-app notifications via Vercel Cron.

## Inputs
- Reminder rules (60/30/14/7)
- Inactivity window (default 30 days)

## Steps
1. Create cron route `src/app/api/cron/notifications/route.ts`.
2. Verify call authenticity (shared secret header) to prevent public abuse.
3. Implement generators:
   - Renewals: scan `Service.renewalDate` and create Notification rows.
   - Due dates: scan `Task.dueDate`.
   - Inactivity: detect clients with no ActivityLog in N days.
4. Deduping: unique constraint on (type, entityId, dueAt bucket) or explicit lookup.
5. Dashboard queries: “expiring soon”, “overdue”, “snoozed”.

## Acceptance Criteria
- Cron run creates notifications without duplicates.
- Dashboard shows correct buckets.

## Common Pitfalls
- Generating duplicates on each run.
- Not handling time zones consistently (store UTC).
