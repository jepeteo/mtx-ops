import { db } from "@/lib/db/db";
import { env } from "@/lib/env";
import { fail, getRequestId, ok } from "@/lib/http/responses";
import { runOrphanAttachmentCleanup } from "@/lib/attachments/cleanup";

/**
 * Called by Vercel cron to clean orphan attachments whose storage cleanup likely failed previously.
 */
export async function GET(req: Request) {
  const requestId = getRequestId(req);

  if (env.CRON_SECRET) {
    const headerSecret = req.headers.get("x-cron-secret");
    const authorization = req.headers.get("authorization") ?? "";
    const bearerSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

    const isValid = headerSecret === env.CRON_SECRET || bearerSecret === env.CRON_SECRET;
    if (!isValid) {
      return fail(requestId, "FORBIDDEN", "Invalid cron secret", undefined, 403);
    }
  }

  const result = await runOrphanAttachmentCleanup({
    actorId: "system:cron",
    requestId,
  });

  return ok(requestId, {
    ...result,
  });
}
