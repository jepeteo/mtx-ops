import { requireAdminApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { createInvoiceController, listInvoicesController } from "@/lib/invoices/apiControllers";

export async function GET(req: Request) {
  return listInvoicesController(req, { requireAuthApi: requireAdminApi, db, fail, ok, logActivity });
}

export async function POST(req: Request) {
  return createInvoiceController(req, { requireAuthApi: requireAdminApi, db, fail, ok, logActivity });
}
