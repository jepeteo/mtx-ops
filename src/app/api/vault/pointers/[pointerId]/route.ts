import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const UpdatePointerSchema = z
  .object({
    label: z.string().min(1).max(180).optional(),
    vaultItemId: z.string().min(1).max(220).optional(),
    fieldName: z.string().min(1).max(120).optional(),
    usernameHint: z.string().max(220).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

type RouteParams = { pointerId: string };

async function getScopedPointer(pointerId: string, workspaceId: string) {
  return db.vaultPointer.findFirst({
    where: {
      id: pointerId,
      client: {
        workspaceId,
      },
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedPointer(routeParams.pointerId, auth.session.workspaceId);

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Vault pointer not found", { pointerId: routeParams.pointerId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdatePointerSchema.safeParse(body);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid vault pointer payload", parsed.error.flatten(), 400);
  }

  const updated = await db.vaultPointer.update({
    where: { id: existing.id },
    data: {
      label: parsed.data.label,
      vaultItemId: parsed.data.vaultItemId,
      fieldName: parsed.data.fieldName,
      usernameHint: parsed.data.usernameHint === undefined ? undefined : parsed.data.usernameHint ?? null,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "vault.pointer.update",
    entityType: "VaultPointer",
    entityId: updated.id,
    metadata: {
      clientId: existing.client.id,
      previous: {
        label: existing.label,
        fieldName: existing.fieldName,
        vaultItemId: existing.vaultItemId,
        usernameHint: existing.usernameHint,
      },
      next: {
        label: updated.label,
        fieldName: updated.fieldName,
        vaultItemId: updated.vaultItemId,
        usernameHint: updated.usernameHint,
      },
    },
  });

  return ok(auth.requestId, { pointer: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<RouteParams> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedPointer(routeParams.pointerId, auth.session.workspaceId);

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Vault pointer not found", { pointerId: routeParams.pointerId }, 404);
  }

  await db.vaultPointer.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "vault.pointer.delete",
    entityType: "VaultPointer",
    entityId: existing.id,
    metadata: {
      clientId: existing.client.id,
      label: existing.label,
      fieldName: existing.fieldName,
      vaultItemId: existing.vaultItemId,
    },
  });

  return ok(auth.requestId, { deleted: true, pointerId: existing.id });
}
