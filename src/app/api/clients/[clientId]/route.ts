import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi, requireRoleApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { logActivity } from "@/lib/activity/logActivity";
import { fail, ok } from "@/lib/http/responses";
import { assertClientVisible } from "@/lib/clients/access";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
  pinnedNotes: z.string().max(20000).optional().nullable(),
  billingRecipient: z.string().max(200).optional().nullable(),
  billingEmail: z.union([z.string().email().max(255), z.literal(""), z.null()]).optional(),
  billingAddress: z.string().max(4000).optional().nullable(),
  billingVatId: z.string().max(80).optional().nullable(),
});

type RouteParams = Promise<{ clientId: string }>;

async function updateClient(params: {
  auth: Awaited<ReturnType<typeof requireAuthApi>> & { session: { userId: string; workspaceId: string } };
  clientId: string;
  payload: {
    name: string;
    status: "ACTIVE" | "PAUSED" | "ARCHIVED";
    pinnedNotes?: string | null;
    billingRecipient?: string | null;
    billingEmail?: string | null;
    billingAddress?: string | null;
    billingVatId?: string | null;
  };
}) {
  const existing = await db.client.findFirst({
    where: { id: params.clientId, workspaceId: params.auth.session.workspaceId },
    select: { id: true },
  });

  if (!existing) {
    return fail(params.auth.requestId, "NOT_FOUND", "Client not found", { clientId: params.clientId }, 404);
  }

  const updated = await db.client.update({
    where: { id: params.clientId },
    data: {
      name: params.payload.name,
      status: params.payload.status,
      pinnedNotes: params.payload.pinnedNotes ?? null,
      ...(params.payload.billingRecipient !== undefined ? { billingRecipient: params.payload.billingRecipient } : {}),
      ...(params.payload.billingEmail !== undefined
        ? { billingEmail: params.payload.billingEmail === "" ? null : params.payload.billingEmail }
        : {}),
      ...(params.payload.billingAddress !== undefined ? { billingAddress: params.payload.billingAddress } : {}),
      ...(params.payload.billingVatId !== undefined ? { billingVatId: params.payload.billingVatId } : {}),
    },
  });

  await logActivity({
    workspaceId: params.auth.session.workspaceId,
    actorId: params.auth.session.userId,
    action: "client.update",
    entityType: "Client",
    entityId: updated.id,
    metadata: { name: updated.name },
  });

  return updated;
}

export async function GET(req: Request, { params }: { params: RouteParams }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const client = await db.client.findFirst({
    where: {
      id: routeParams.clientId,
      workspaceId: auth.session.workspaceId,
    },
    include: {
      services: true,
      assetLinks: true,
      vaultPointers: true,
    },
  });

  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const visible = await assertClientVisible({
    clientId: client.id,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  return ok(auth.requestId, { client });
}

export async function PATCH(req: Request, { params }: { params: RouteParams }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid client payload", parsed.error.flatten(), 400);
  }

  const updated = await updateClient({
    auth,
    clientId: routeParams.clientId,
    payload: parsed.data,
  });

  if (updated instanceof Response) return updated;
  return ok(auth.requestId, { client: updated });
}

export async function DELETE(req: Request, { params }: { params: RouteParams }) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const existing = await db.client.findFirst({
    where: { id: routeParams.clientId, workspaceId: auth.session.workspaceId },
    select: { id: true, name: true },
  });

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  await db.client.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "client.delete",
    entityType: "Client",
    entityId: existing.id,
    metadata: { name: existing.name },
  });

  return ok(auth.requestId, { deleted: true, clientId: existing.id });
}

export async function POST(req: Request, { params }: { params: RouteParams }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;

  const contentType = req.headers.get("content-type") || "";
  const expectsJson = contentType.includes("application/json") || (req.headers.get("accept") || "").includes("application/json");

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(auth.requestId, "VALIDATION_ERROR", "Invalid client payload", parsed.error.flatten(), 400);
    }

    const updated = await updateClient({
      auth,
      clientId: routeParams.clientId,
      payload: parsed.data,
    });

    if (updated instanceof Response) return updated;
    return ok(auth.requestId, { client: updated });
  }

  const form = await req.formData();
  const method = String(form.get("_method") || "").toLowerCase();
  if (method !== "put") {
    return fail(auth.requestId, "VALIDATION_ERROR", "Unsupported form method", { expected: "put" }, 405);
  }

  const raw = {
    name: form.get("name"),
    status: form.get("status"),
    pinnedNotes: form.get("pinnedNotes"),
    billingRecipient: form.get("billingRecipient") || null,
    billingEmail: form.get("billingEmail") || null,
    billingAddress: form.get("billingAddress") || null,
    billingVatId: form.get("billingVatId") || null,
  };

  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid client payload", parsed.error.flatten(), 400);
  }

  const updated = await updateClient({
    auth,
    clientId: routeParams.clientId,
    payload: parsed.data,
  });

  if (updated instanceof Response) return updated;

  if (expectsJson) {
    return ok(auth.requestId, { client: updated });
  }

  return NextResponse.redirect(new URL(`/app/clients/${updated.id}`, process.env.APP_URL || "http://localhost:3000"));
}
