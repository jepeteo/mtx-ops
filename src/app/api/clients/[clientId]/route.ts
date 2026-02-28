import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { logActivity } from "@/lib/activity/logActivity";
import { fail } from "@/lib/http/responses";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
  pinnedNotes: z.string().max(20000).optional().nullable(),
});

export async function POST(req: Request, { params }: { params: { clientId: string } }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const form = await req.formData();
  const method = String(form.get("_method") || "").toLowerCase();
  if (method !== "put") {
    return fail(auth.requestId, "VALIDATION_ERROR", "Unsupported form method", { expected: "put" }, 405);
  }

  const raw = {
    name: form.get("name"),
    status: form.get("status"),
    pinnedNotes: form.get("pinnedNotes"),
  };

  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid client payload", parsed.error.flatten(), 400);
  }

  const existing = await db.client.findFirst({
    where: { id: params.clientId, workspaceId: auth.session.workspaceId },
    select: { id: true },
  });

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: params.clientId }, 404);
  }

  const updated = await db.client.update({
    where: { id: params.clientId },
    data: {
      name: parsed.data.name,
      status: parsed.data.status,
      pinnedNotes: parsed.data.pinnedNotes ?? null,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "client.update",
    entityType: "Client",
    entityId: updated.id,
    metadata: { name: updated.name },
  });

  return NextResponse.redirect(new URL(`/app/clients/${updated.id}`, process.env.APP_URL || "http://localhost:3000"));
}
