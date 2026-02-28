import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { logActivity } from "@/lib/activity/logActivity";
import { fail, ok } from "@/lib/http/responses";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
  pinnedNotes: z.string().max(20000).optional().nullable(),
});

type RouteParams = { clientId: string };

async function updateClient(params: {
  auth: Awaited<ReturnType<typeof requireAuthApi>> & { session: { userId: string; workspaceId: string } };
  clientId: string;
  payload: { name: string; status: "ACTIVE" | "PAUSED" | "ARCHIVED"; pinnedNotes?: string | null };
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

  const client = await db.client.findFirst({
    where: {
      id: params.clientId,
      workspaceId: auth.session.workspaceId,
    },
    include: {
      services: true,
      assetLinks: true,
      vaultPointers: true,
    },
  });

  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: params.clientId }, 404);
  }

  return ok(auth.requestId, { client });
}

export async function PATCH(req: Request, { params }: { params: RouteParams }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid client payload", parsed.error.flatten(), 400);
  }

  const updated = await updateClient({
    auth,
    clientId: params.clientId,
    payload: parsed.data,
  });

  if (updated instanceof Response) return updated;
  return ok(auth.requestId, { client: updated });
}

export async function DELETE(req: Request, { params }: { params: RouteParams }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const existing = await db.client.findFirst({
    where: { id: params.clientId, workspaceId: auth.session.workspaceId },
    select: { id: true, name: true },
  });

  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: params.clientId }, 404);
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

  const updated = await updateClient({
    auth,
    clientId: params.clientId,
    payload: parsed.data,
  });

  if (updated instanceof Response) return updated;

  return NextResponse.redirect(new URL(`/app/clients/${updated.id}`, process.env.APP_URL || "http://localhost:3000"));
}
