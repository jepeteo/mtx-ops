import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const AssetLinkUpdateSchema = z
  .object({
    kind: z.string().min(1).max(80).optional(),
    label: z.string().min(1).max(200).optional(),
    url: z.string().url().max(2048).optional(),
    environment: z.string().max(40).optional().nullable(),
    tags: z.array(z.string().min(1).max(40)).max(12).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

async function getScopedAssetLink(linkId: string, workspaceId: string) {
  return db.assetLink.findFirst({
    where: {
      id: linkId,
      client: { workspaceId },
    },
    select: {
      id: true,
      clientId: true,
      kind: true,
      label: true,
      url: true,
      environment: true,
      tags: true,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedAssetLink(routeParams.linkId, auth.session.workspaceId);

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Asset link not found", { linkId: routeParams.linkId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = AssetLinkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid asset link payload", parsed.error.flatten(), 400);
  }

  const assetLink = await db.assetLink.update({
    where: { id: existing.id },
    data: {
      kind: parsed.data.kind,
      label: parsed.data.label,
      url: parsed.data.url,
      environment: parsed.data.environment,
      tags: parsed.data.tags,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "asset_link.update",
    entityType: "AssetLink",
    entityId: assetLink.id,
    metadata: {
      clientId: existing.clientId,
      previousKind: existing.kind,
      nextKind: assetLink.kind,
      previousLabel: existing.label,
      nextLabel: assetLink.label,
      previousUrl: existing.url,
      nextUrl: assetLink.url,
    },
  });

  return ok(auth.requestId, { assetLink });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedAssetLink(routeParams.linkId, auth.session.workspaceId);

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Asset link not found", { linkId: routeParams.linkId }, 404);
  }

  await db.assetLink.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "asset_link.delete",
    entityType: "AssetLink",
    entityId: existing.id,
    metadata: {
      clientId: existing.clientId,
      kind: existing.kind,
      label: existing.label,
      url: existing.url,
      environment: existing.environment,
      tags: existing.tags,
    },
  });

  return ok(auth.requestId, { deleted: true, linkId: existing.id });
}
