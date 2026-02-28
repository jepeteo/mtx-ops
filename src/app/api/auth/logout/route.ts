import { clearSessionCookie } from "@/lib/auth/session";
import { getRequestId, ok } from "@/lib/http/responses";
import { getSessionFromApiRequest } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/logActivity";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const session = await getSessionFromApiRequest(req);

  const res = ok(requestId, { loggedOut: true });
  clearSessionCookie(res);

  if (session) {
    await logActivity({
      workspaceId: session.workspaceId,
      actorId: session.userId,
      action: "auth.logout",
      entityType: "User",
      entityId: session.userId,
      metadata: { email: session.userEmail },
    });
  }

  return res;
}
