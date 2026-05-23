import { requireRoleApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { buildWeeklyDigest, formatWeeklyDigestText } from "@/lib/digest/weeklyDigest";
import {
  getWeeklyDigestEmailConfigFromEnv,
  sendWeeklyDigestEmailWithResend,
} from "@/lib/digest/resendWeeklyDigestEmail";
import { logActivity } from "@/lib/activity/logActivity";

export async function POST(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const emailConfig = getWeeklyDigestEmailConfigFromEnv();
  if (!emailConfig) {
    return fail(auth.requestId, "CONFIG_ERROR", "Email is not configured for this workspace", undefined, 503);
  }

  const workspace = await db.workspace.findFirst({
    where: { id: auth.session.workspaceId },
    select: { id: true, name: true },
  });
  if (!workspace) {
    return fail(auth.requestId, "NOT_FOUND", "Workspace not found", undefined, 404);
  }

  const digest = await buildWeeklyDigest(workspace.id);
  const textBody = formatWeeklyDigestText(digest, workspace.name);
  const subject = `MTX Ops weekly digest — ${new Date().toISOString().slice(0, 10)}`;

  const result = await sendWeeklyDigestEmailWithResend({
    apiKey: emailConfig.apiKey,
    from: emailConfig.from,
    to: auth.session.userEmail,
    subject,
    textBody,
  });

  if ("error" in result) {
    return fail(auth.requestId, "INTERNAL", "Failed to send digest email", { error: result.error }, 500);
  }

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "digest.weekly.email_sent",
    entityType: "Workspace",
    entityId: workspace.id,
    metadata: { recipientEmail: auth.session.userEmail, resendMessageId: result.messageId },
  });

  return ok(auth.requestId, { sent: true, messageId: result.messageId, digest });
}
