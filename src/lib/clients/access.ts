import type { Role } from "@/lib/auth/types";
import { hasMinRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/db";

export function canSeeAllClients(role: Role): boolean {
  return hasMinRole(role, "ADMIN");
}

export async function getMemberVisibleClientIds(userId: string, workspaceId: string): Promise<string[]> {
  const rows = await db.clientMemberAccess.findMany({
    where: { userId, workspaceId },
    select: { clientId: true },
  });
  return rows.map((row) => row.clientId);
}

export async function assertClientVisible(params: {
  clientId: string;
  workspaceId: string;
  userId: string;
  role: Role;
}): Promise<boolean> {
  if (canSeeAllClients(params.role)) return true;
  const access = await db.clientMemberAccess.findFirst({
    where: {
      clientId: params.clientId,
      userId: params.userId,
      workspaceId: params.workspaceId,
    },
    select: { id: true },
  });
  return Boolean(access);
}

export function clientListFilter(params: {
  workspaceId: string;
  role: Role;
  visibleClientIds: string[];
}): { workspaceId: string; id?: { in: string[] } } {
  const base = { workspaceId: params.workspaceId };
  if (canSeeAllClients(params.role)) return base;
  return { ...base, id: { in: params.visibleClientIds } };
}
