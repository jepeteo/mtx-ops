import { validateCronSecret } from "@/lib/cron/validateCronSecret";
import { getRequestId, ok } from "@/lib/http/responses";
import { runOrphanAttachmentCleanup } from "@/lib/attachments/cleanup";

/**
 * Called by Vercel cron to clean orphan attachments whose storage cleanup likely failed previously.
 */
export async function GET(req: Request) {
  const requestId = getRequestId(req);

  const cronAuthError = validateCronSecret(req, requestId);
  if (cronAuthError) return cronAuthError;

  const result = await runOrphanAttachmentCleanup({
    actorId: "system:cron",
    requestId,
  });

  return ok(requestId, {
    ...result,
  });
}
