import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireRoleApi } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const UpdateUserSchema = z
  .object({
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "At least one field (role or status) must be provided",
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const payload = await req.json().catch(() => null);
  const parsed = UpdateUserSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid user update payload", parsed.error.flatten(), 400);
  }

  const targetUser = await db.user.findFirst({
    where: {
      id: routeParams.userId,
      workspaceId: auth.session.workspaceId,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!targetUser) {
    return fail(auth.requestId, "NOT_FOUND", "User not found in workspace", { userId: routeParams.userId }, 404);
  }

  if (auth.session.role === "ADMIN") {
    if (targetUser.role !== "MEMBER") {
      return fail(auth.requestId, "FORBIDDEN", "Admins can only manage Member users", undefined, 403);
    }

    if (parsed.data.role === "OWNER") {
      return fail(auth.requestId, "FORBIDDEN", "Admins cannot assign Owner role", undefined, 403);
    }
  }

  if (parsed.data.status === "DISABLED" && targetUser.id === auth.session.userId) {
    return fail(auth.requestId, "FORBIDDEN", "You cannot disable your own account", undefined, 403);
  }

  const updatedUser = await db.user.update({
    where: { id: targetUser.id },
    data: {
      role: parsed.data.role,
      status: parsed.data.status,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "user.update",
    entityType: "User",
    entityId: updatedUser.id,
    metadata: {
      previousRole: targetUser.role,
      nextRole: updatedUser.role,
      previousStatus: targetUser.status,
      nextStatus: updatedUser.status,
    },
  });

  return ok(auth.requestId, { user: updatedUser });
}
