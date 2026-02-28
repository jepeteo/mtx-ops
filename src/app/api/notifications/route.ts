import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { ok } from "@/lib/http/responses";

export async function GET(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const notifications = await db.notification.findMany({
    where: {
      workspaceId: auth.session.workspaceId,
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return ok(auth.requestId, { notifications });
}
