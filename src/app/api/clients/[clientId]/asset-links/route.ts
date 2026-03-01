import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const AssetLinkCreateSchema = z.object({
  kind: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  url: z.string().url().max(2048),
  environment: z.string().max(40).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(12).optional().default([]),
});

export async function GET(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const client = await db.client.findFirst({
    where: { id: routeParams.clientId, workspaceId: auth.session.workspaceId },
    select: { id: true },
  });

  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const assetLinks = await db.assetLink.findMany({
    where: { clientId: routeParams.clientId },
    orderBy: [{ createdAt: "desc" }],
  });

  return ok(auth.requestId, { assetLinks });
}

export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const client = await db.client.findFirst({
    where: { id: routeParams.clientId, workspaceId: auth.session.workspaceId },
    select: { id: true },
  });

  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = AssetLinkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid asset link payload", parsed.error.flatten(), 400);
  }

  const assetLink = await db.assetLink.create({
    data: {
      clientId: routeParams.clientId,
      kind: parsed.data.kind,
      label: parsed.data.label,
      url: parsed.data.url,
      environment: parsed.data.environment ?? null,
      tags: parsed.data.tags,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "asset_link.create",
    entityType: "AssetLink",
    entityId: assetLink.id,
    metadata: {
      clientId: routeParams.clientId,
      kind: assetLink.kind,
      label: assetLink.label,
      environment: assetLink.environment,
      tags: assetLink.tags,
    },
  });

  return ok(auth.requestId, { assetLink }, { status: 201 });
}
