import { requireAuthApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { buildWeeklyDigest } from "@/lib/digest/weeklyDigest";

export async function GET(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const digest = await buildWeeklyDigest(auth.session.workspaceId);
  return ok(auth.requestId, { digest });
}
