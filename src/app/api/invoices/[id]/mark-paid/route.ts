import { requireAuthApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { markPaidController } from "@/lib/invoices/apiControllers";

type RouteParams = { id: string };

export async function POST(req: Request, { params }: { params: Promise<RouteParams> }) {
  const routeParams = await params;
  return markPaidController(req, routeParams, { requireAuthApi, db, fail, ok, logActivity });
}
