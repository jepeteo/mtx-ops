import { z } from "zod";
import { db } from "@/lib/db/db";
import { env } from "@/lib/env";
import { assertRateLimit } from "@/lib/auth/rateLimit";
import {
  buildPasswordResetUrl,
  issuePasswordResetToken,
  normalizeAuthEmail,
} from "@/lib/auth/passwordReset";
import { getPasswordResetEmailConfigFromEnv, sendPasswordResetEmailWithResend } from "@/lib/auth/passwordResetEmail";
import { fail, getRequestId, logServerError, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const Schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return fail(requestId, "VALIDATION_ERROR", "Invalid email", parsed.error.flatten(), 400);
  }

  const email = normalizeAuthEmail(parsed.data.email);
  const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = await assertRateLimit({
    scope: "auth.forgot-password",
    identifier: `${email}|${sourceIp}`,
    maxRequests: 5,
    windowSec: 15 * 60,
  });
  if (rate.limited) {
    return fail(requestId, "RATE_LIMITED", "Too many reset requests. Please try again later.", undefined, 429);
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true, workspaceId: true },
  });

  if (!user) {
    return fail(requestId, "NOT_FOUND", "No account exists for this email", undefined, 404);
  }

  if (user.status !== "ACTIVE") {
    return fail(requestId, "FORBIDDEN", "This account is disabled", undefined, 403);
  }

  const emailConfig = getPasswordResetEmailConfigFromEnv();
  if (!emailConfig) {
    logServerError({
      requestId,
      code: "CONFIG_ERROR",
      message: "Password reset email is not configured",
      metadata: { userId: user.id },
    });
    return fail(
      requestId,
      "CONFIG_ERROR",
      "Password reset is not configured (RESEND_API_KEY and AUTH_EMAIL_FROM or INVOICE_EMAIL_FROM required)",
      undefined,
      503,
    );
  }

  const { token } = await issuePasswordResetToken(user.id);
  const resetUrl = buildPasswordResetUrl(env.APP_URL, token);
  const sendResult = await sendPasswordResetEmailWithResend({
    apiKey: emailConfig.apiKey,
    from: emailConfig.from,
    to: user.email,
    resetUrl,
  });

  if ("error" in sendResult) {
    logServerError({
      requestId,
      code: "UPSTREAM_UNAVAILABLE",
      message: "Failed to send password reset email",
      metadata: { userId: user.id, reason: sendResult.error },
    });
    await logActivity({
      workspaceId: user.workspaceId,
      actorId: user.id,
      action: "auth.password_reset_email_failed",
      entityType: "User",
      entityId: user.id,
      metadata: { reason: sendResult.error },
    });
    return fail(requestId, "UPSTREAM_UNAVAILABLE", "Failed to send reset email. Please try again later.", undefined, 502);
  }

  await logActivity({
    workspaceId: user.workspaceId,
    actorId: user.id,
    action: "auth.password_reset_email_sent",
    entityType: "User",
    entityId: user.id,
    metadata: { messageId: sendResult.messageId },
  });

  return ok(requestId, { sent: true });
}
