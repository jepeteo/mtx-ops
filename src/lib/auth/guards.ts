import { redirect } from "next/navigation";
import { getSession, getSessionFromApiRequest } from "./session";
import type { Role } from "./types";
import { fail, getRequestId } from "@/lib/http/responses";

const ROLE_ORDER: Record<Role, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasMinRole(currentRole: Role, minRole: Role) {
  return ROLE_ORDER[currentRole] >= ROLE_ORDER[minRole];
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(minRole: Role) {
  const session = await requireAuth();
  if (!hasMinRole(session.role, minRole)) redirect("/app");
  return session;
}

export async function requireAuthApi(req: Request) {
  const requestId = getRequestId(req);
  const session = await getSessionFromApiRequest(req);
  if (!session) {
    return { errorResponse: fail(requestId, "UNAUTHORIZED", "Authentication required", undefined, 401) };
  }

  return { session, requestId };
}

export async function requireRoleApi(req: Request, minRole: Role) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth;

  if (!hasMinRole(auth.session.role, minRole)) {
    return { errorResponse: fail(auth.requestId, "FORBIDDEN", "Insufficient role", { required: minRole }, 403) };
  }

  return auth;
}

export const requireSession = requireAuth;
export const requireSessionApi = async (req: Request) => {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) throw auth.errorResponse;
  return auth.session;
};
