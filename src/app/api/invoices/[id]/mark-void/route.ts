import { requireAdminApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { markVoidController } from "@/lib/invoices/apiControllers";

type RouteParams = { id: string };

export async function POST(req: Request, { params }: { params: Promise<RouteParams> }) {
  const routeParams = await params;
  return markVoidController(req, routeParams, { requireAuthApi: requireAdminApi, db, fail, ok, logActivity });
}
