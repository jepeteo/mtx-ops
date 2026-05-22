import { requireAdminApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { getInvoiceController, patchInvoiceController } from "@/lib/invoices/apiControllers";

type RouteParams = { id: string };

export async function GET(req: Request, { params }: { params: Promise<RouteParams> }) {
  const routeParams = await params;
  return getInvoiceController(req, routeParams, { requireAuthApi: requireAdminApi, db, fail, ok, logActivity });
}

export async function PATCH(req: Request, { params }: { params: Promise<RouteParams> }) {
  const routeParams = await params;
  return patchInvoiceController(req, routeParams, { requireAuthApi: requireAdminApi, db, fail, ok, logActivity });
}
