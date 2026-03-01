import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { z } from "zod";

const QuerySchema = z.object({
  type: z.enum(["RENEWAL", "TASK", "INACTIVITY", "HANDOVER"]).optional(),
  status: z.enum(["OPEN", "SNOOZED", "HANDLED"]).optional(),
});

export async function GET(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const url = new URL(req.url);
  const parsedQuery = QuerySchema.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });

  if (!parsedQuery.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid notifications query", parsedQuery.error.flatten(), 400);
  }

  const notifications = await db.notification.findMany({
    where: {
      workspaceId: auth.session.workspaceId,
      ...(parsedQuery.data.type ? { type: parsedQuery.data.type } : {}),
      ...(parsedQuery.data.status ? { status: parsedQuery.data.status } : {}),
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return ok(auth.requestId, { notifications });
}
