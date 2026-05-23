import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { assertClientVisible } from "@/lib/clients/access";
import { shouldClearOtherPrimaries, validatePrimaryDeleteWithTotal } from "@/lib/contacts/primary";

const ContactUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    role: z.string().max(120).optional().nullable(),
    email: z.union([z.string().email().max(255), z.literal(""), z.null()]).optional(),
    phone: z.string().max(80).optional().nullable(),
    isPrimary: z.boolean().optional(),
    notes: z.string().max(4_000).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

async function getScopedContact(contactId: string, workspaceId: string) {
  return db.contact.findFirst({
    where: {
      id: contactId,
      client: { workspaceId },
    },
    include: {
      client: { select: { id: true, workspaceId: true } },
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedContact(routeParams.contactId, auth.session.workspaceId);
  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Contact not found", { contactId: routeParams.contactId }, 404);
  }

  const visible = await assertClientVisible({
    clientId: existing.clientId,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Contact not found", { contactId: routeParams.contactId }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = ContactUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid contact payload", parsed.error.flatten(), 400);
  }

  const email =
    parsed.data.email === undefined
      ? undefined
      : parsed.data.email === ""
        ? null
        : parsed.data.email;

  const contact = await db.$transaction(async (tx) => {
    if (shouldClearOtherPrimaries(parsed.data.isPrimary)) {
      await tx.contact.updateMany({
        where: { clientId: existing.clientId, isPrimary: true, id: { not: existing.id } },
        data: { isPrimary: false },
      });
    }

    return tx.contact.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
        ...(parsed.data.isPrimary !== undefined ? { isPrimary: parsed.data.isPrimary } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
    });
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "contact.update",
    entityType: "Contact",
    entityId: contact.id,
    metadata: { clientId: existing.clientId, name: contact.name, isPrimary: contact.isPrimary },
  });

  return ok(auth.requestId, { contact });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const existing = await getScopedContact(routeParams.contactId, auth.session.workspaceId);
  if (!existing) {
    return fail(auth.requestId, "NOT_FOUND", "Contact not found", { contactId: routeParams.contactId }, 404);
  }

  const visible = await assertClientVisible({
    clientId: existing.clientId,
    workspaceId: auth.session.workspaceId,
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!visible) {
    return fail(auth.requestId, "NOT_FOUND", "Contact not found", { contactId: routeParams.contactId }, 404);
  }

  const totalContacts = await db.contact.count({ where: { clientId: existing.clientId } });
  const deleteError = validatePrimaryDeleteWithTotal({ isPrimary: existing.isPrimary }, totalContacts);
  if (deleteError) {
    return fail(auth.requestId, "VALIDATION_ERROR", deleteError, { contactId: existing.id }, 400);
  }

  await db.contact.delete({ where: { id: existing.id } });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "contact.delete",
    entityType: "Contact",
    entityId: existing.id,
    metadata: { clientId: existing.clientId, name: existing.name },
  });

  return ok(auth.requestId, { deleted: true, contactId: existing.id });
}
