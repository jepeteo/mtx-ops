import { requireRoleApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { mergeInvoiceIssuer, parseInvoiceIssuerJson, PatchInvoiceIssuerSchema } from "@/lib/workspace/invoiceIssuer";

export async function GET(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const workspace = await db.workspace.findFirst({
    where: { id: auth.session.workspaceId },
    select: { invoiceIssuer: true },
  });

  if (!workspace) {
    return fail(auth.requestId, "NOT_FOUND", "Workspace not found", undefined, 404);
  }

  const issuer = parseInvoiceIssuerJson(workspace.invoiceIssuer);
  return ok(auth.requestId, { invoiceIssuer: issuer });
}

export async function PATCH(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = PatchInvoiceIssuerSchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid invoice issuer payload", parsed.error.flatten(), 400);
  }

  const workspace = await db.workspace.findFirst({
    where: { id: auth.session.workspaceId },
    select: { id: true, invoiceIssuer: true },
  });

  if (!workspace) {
    return fail(auth.requestId, "NOT_FOUND", "Workspace not found", undefined, 404);
  }

  const next = mergeInvoiceIssuer(parseInvoiceIssuerJson(workspace.invoiceIssuer), parsed.data);

  await db.workspace.update({
    where: { id: workspace.id },
    data: { invoiceIssuer: next as object },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "workspace.invoice_issuer.update",
    entityType: "Workspace",
    entityId: workspace.id,
    metadata: { hasLogo: Boolean(next.logoUrl), hasPayment: Boolean(next.payment) },
  });

  return ok(auth.requestId, { invoiceIssuer: next });
}
