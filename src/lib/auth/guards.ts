import { redirect } from "next/navigation";
import { getSession, getSessionFromApiRequest } from "./session";
import type { Role } from "./types";
import { fail, getRequestId } from "@/lib/http/responses";
import { db } from "@/lib/db/db";

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

  const user = await db.user.findFirst({
    where: {
      id: session.userId,
      workspaceId: session.workspaceId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      role: true,
      workspaceId: true,
    },
  });

  if (!user) redirect("/login");

  return {
    userId: user.id,
    userEmail: user.email,
    role: user.role,
    workspaceId: user.workspaceId,
  };
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

  const user = await db.user.findFirst({
    where: {
      id: session.userId,
      workspaceId: session.workspaceId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      role: true,
      workspaceId: true,
    },
  });

  if (!user) {
    return { errorResponse: fail(requestId, "UNAUTHORIZED", "Session is no longer active", undefined, 401) };
  }

  return {
    requestId,
    session: {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    },
  };
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
