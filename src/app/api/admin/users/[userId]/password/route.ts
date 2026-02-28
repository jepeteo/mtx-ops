import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireRoleApi } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const ResetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const routeParams = await params;
  const payload = await req.json().catch(() => null);
  const parsed = ResetPasswordSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid reset password payload", parsed.error.flatten(), 400);
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
    },
  });

  if (!targetUser) {
    return fail(auth.requestId, "NOT_FOUND", "User not found in workspace", { userId: routeParams.userId }, 404);
  }

  if (auth.session.role === "ADMIN" && targetUser.role !== "MEMBER") {
    return fail(auth.requestId, "FORBIDDEN", "Admins can only reset password for Member users", undefined, 403);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.user.update({
    where: { id: targetUser.id },
    data: { passwordHash },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "user.password_reset",
    entityType: "User",
    entityId: targetUser.id,
    metadata: { targetEmail: targetUser.email },
  });

  return ok(auth.requestId, { reset: true });
}
