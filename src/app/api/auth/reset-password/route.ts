import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { assertRateLimit } from "@/lib/auth/rateLimit";
import { consumePasswordResetToken, findValidPasswordResetToken } from "@/lib/auth/passwordReset";
import { fail, getRequestId, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const Schema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return fail(requestId, "VALIDATION_ERROR", "Invalid reset password payload", parsed.error.flatten(), 400);
  }

  const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = await assertRateLimit({
    scope: "auth.reset-password",
    identifier: sourceIp,
    maxRequests: 10,
    windowSec: 15 * 60,
  });
  if (rate.limited) {
    return fail(requestId, "RATE_LIMITED", "Too many reset attempts. Please try again later.", undefined, 429);
  }

  const resetRecord = await findValidPasswordResetToken(parsed.data.token);
  if (!resetRecord) {
    return fail(requestId, "NOT_FOUND", "Reset link is invalid or has expired", undefined, 404);
  }

  if (resetRecord.user.status !== "ACTIVE") {
    return fail(requestId, "FORBIDDEN", "This account is disabled", undefined, 403);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await consumePasswordResetToken(resetRecord.id, resetRecord.user.id, passwordHash);

  await logActivity({
    workspaceId: resetRecord.user.workspaceId,
    actorId: resetRecord.user.id,
    action: "auth.password_reset",
    entityType: "User",
    entityId: resetRecord.user.id,
  });

  return ok(requestId, { reset: true });
}
