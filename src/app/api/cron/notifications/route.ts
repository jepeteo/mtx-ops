import { getRequestId, ok } from "@/lib/http/responses";

/**
 * V1 scaffold:
 * - Phase 2 will generate notifications for renewals, due dates, inactivity.
 * - Called by Vercel cron every 6 hours (see vercel.json).
 */
export async function GET(req: Request) {
  const requestId = getRequestId(req);
  return ok(requestId, { message: "Notification cron scaffold. Implement in Phase 2." });
}
