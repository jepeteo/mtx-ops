import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { logActivity } from "@/lib/activity/logActivity";
import { fail, ok } from "@/lib/http/responses";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE"),
});

export async function GET(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const clients = await db.client.findMany({
    where: { workspaceId: auth.session.workspaceId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      pinnedNotes: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return ok(auth.requestId, { clients });
}

export async function POST(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  // Support HTML form POST (application/x-www-form-urlencoded)
  const contentType = req.headers.get("content-type") || "";
  let raw: unknown = null;
  if (contentType.includes("application/json")) raw = await req.json().catch(() => null);
  else {
    const form = await req.formData();
    raw = { name: form.get("name"), status: form.get("status") };
  }

  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid client payload", parsed.error.flatten(), 400);
  }

  const client = await db.client.create({
    data: {
      workspaceId: auth.session.workspaceId,
      name: parsed.data.name,
      status: parsed.data.status,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "client.create",
    entityType: "Client",
    entityId: client.id,
    metadata: { name: client.name },
  });

  return NextResponse.redirect(new URL(`/app/clients/${client.id}`, process.env.APP_URL || "http://localhost:3000"));
}
