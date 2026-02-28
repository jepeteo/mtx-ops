import { requireAuthApi } from "@/lib/auth/guards";
import { ok } from "@/lib/http/responses";

export async function GET(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  return ok(auth.requestId, {
    user: {
      id: auth.session.userId,
      email: auth.session.userEmail,
      role: auth.session.role,
      workspaceId: auth.session.workspaceId,
    },
  });
}
