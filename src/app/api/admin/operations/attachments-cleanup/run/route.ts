import { requireRoleApi } from "@/lib/auth/guards";
import { ok } from "@/lib/http/responses";
import { runOrphanAttachmentCleanup } from "@/lib/attachments/cleanup";

export async function POST(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const result = await runOrphanAttachmentCleanup({
    actorId: auth.session.userId,
    requestId: auth.requestId,
  });

  return ok(auth.requestId, result);
}
