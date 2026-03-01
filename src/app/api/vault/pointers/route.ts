import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const CreatePointerSchema = z.object({
  clientId: z.string().uuid(),
  label: z.string().min(1).max(180),
  vaultItemId: z.string().min(1).max(220),
  fieldName: z.string().min(1).max(120),
  usernameHint: z.string().max(220).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = CreatePointerSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid vault pointer payload", parsed.error.flatten(), 400);
  }

  const client = await db.client.findFirst({
    where: {
      id: parsed.data.clientId,
      workspaceId: auth.session.workspaceId,
    },
    select: { id: true, name: true },
  });

  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: parsed.data.clientId }, 404);
  }

  const pointer = await db.vaultPointer.create({
    data: {
      clientId: client.id,
      label: parsed.data.label,
      vaultItemId: parsed.data.vaultItemId,
      fieldName: parsed.data.fieldName,
      usernameHint: parsed.data.usernameHint ?? null,
      ownerUserId: auth.session.userId,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "vault.pointer.create",
    entityType: "VaultPointer",
    entityId: pointer.id,
    metadata: {
      clientId: client.id,
      clientName: client.name,
      label: pointer.label,
      fieldName: pointer.fieldName,
      vaultItemId: pointer.vaultItemId,
    },
  });

  return ok(auth.requestId, { pointer }, { status: 201 });
}
