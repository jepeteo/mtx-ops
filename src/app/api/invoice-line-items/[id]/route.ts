import { requireAdminApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { deleteInvoiceLineItemController, updateInvoiceLineItemController } from "@/lib/invoices/apiControllers";

type RouteParams = { id: string };

export async function PATCH(req: Request, { params }: { params: Promise<RouteParams> }) {
  const routeParams = await params;
  return updateInvoiceLineItemController(req, routeParams, { requireAuthApi: requireAdminApi, db, fail, ok, logActivity });
}

export async function DELETE(req: Request, { params }: { params: Promise<RouteParams> }) {
  const routeParams = await params;
  return deleteInvoiceLineItemController(req, routeParams, { requireAuthApi: requireAdminApi, db, fail, ok, logActivity });
}
