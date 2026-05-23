import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { assertClientVisible } from "@/lib/clients/access";
import { shouldClearOtherPrimaries } from "@/lib/contacts/primary";

const ContactCreateSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(120).optional().nullable(),
  email: z.union([z.string().email().max(255), z.literal(""), z.null()]).optional(),
  phone: z.string().max(80).optional().nullable(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(4_000).optional().nullable(),
});

async function getScopedClient(clientId: string, workspaceId: string) {
  return db.client.findFirst({
    where: { id: clientId, workspaceId },
    select: { id: true },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const visible = await assertClientVisible({
    clientId: routeParams.clientId,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const client = await getScopedClient(routeParams.clientId, auth.session.workspaceId);
  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const contacts = await db.contact.findMany({
    where: { clientId: routeParams.clientId },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

  return ok(auth.requestId, { contacts });
}

export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const visible = await assertClientVisible({
    clientId: routeParams.clientId,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const client = await getScopedClient(routeParams.clientId, auth.session.workspaceId);
  if (!client) {
    return fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: routeParams.clientId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = ContactCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid contact payload", parsed.error.flatten(), 400);
  }

  const email = parsed.data.email === "" ? null : (parsed.data.email ?? null);

  const contact = await db.$transaction(async (tx) => {
    if (shouldClearOtherPrimaries(parsed.data.isPrimary)) {
      await tx.contact.updateMany({
        where: { clientId: routeParams.clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return tx.contact.create({
      data: {
        clientId: routeParams.clientId,
        name: parsed.data.name,
        role: parsed.data.role ?? null,
        email,
        phone: parsed.data.phone ?? null,
        isPrimary: parsed.data.isPrimary,
        notes: parsed.data.notes ?? null,
      },
    });
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "contact.create",
    entityType: "Contact",
    entityId: contact.id,
    metadata: { clientId: routeParams.clientId, name: contact.name, isPrimary: contact.isPrimary },
  });

  return ok(auth.requestId, { contact }, { status: 201 });
}
