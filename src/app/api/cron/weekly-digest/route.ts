import { db } from "@/lib/db/db";
import { validateCronSecret } from "@/lib/cron/validateCronSecret";
import { fail, getRequestId, logServerError, ok } from "@/lib/http/responses";
import { buildWeeklyDigest, formatWeeklyDigestText } from "@/lib/digest/weeklyDigest";
import {
  getWeeklyDigestEmailConfigFromEnv,
  sendWeeklyDigestEmailWithResend,
} from "@/lib/digest/resendWeeklyDigestEmail";
import { logActivity } from "@/lib/activity/logActivity";

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  const cronAuthError = validateCronSecret(req, requestId);
  if (cronAuthError) return cronAuthError;

  try {
    const workspace = await db.workspace.findFirst({
      select: { id: true, name: true },
    });
    if (!workspace) {
      return fail(requestId, "NOT_FOUND", "Workspace not found", undefined, 404);
    }

    const digest = await buildWeeklyDigest(workspace.id);
    const emailConfig = getWeeklyDigestEmailConfigFromEnv();
    const recipients = await db.user.findMany({
      where: {
        workspaceId: workspace.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { id: true, email: true },
    });

    let emailsSent = 0;
    let emailError: string | null = null;

    if (emailConfig && recipients.length > 0) {
      const textBody = formatWeeklyDigestText(digest, workspace.name);
      const subject = `MTX Ops weekly digest — ${new Date().toISOString().slice(0, 10)}`;

      for (const recipient of recipients) {
        const result = await sendWeeklyDigestEmailWithResend({
          apiKey: emailConfig.apiKey,
          from: emailConfig.from,
          to: recipient.email,
          subject,
          textBody,
        });
        if ("error" in result) {
          emailError = result.error;
          break;
        }
        emailsSent += 1;
      }
    }

    await logActivity({
      workspaceId: workspace.id,
      actorId: "system:cron",
      action: "digest.weekly.generated",
      entityType: "Workspace",
      entityId: workspace.id,
      metadata: {
        emailsSent,
        emailConfigured: Boolean(emailConfig),
        emailError,
        renewals: digest.renewalsNext7Days.length,
        overdueInvoices: digest.overdueSentInvoices.length,
        handovers: digest.unacknowledgedHandovers.length,
        tasksDue: digest.tasksDueNext7Days.length,
        inactiveClients: digest.inactiveClients.length,
      },
    });

    return ok(requestId, {
      digest,
      emailsSent,
      emailConfigured: Boolean(emailConfig),
      emailError,
      message: "Weekly digest processed",
    });
  } catch (error) {
    logServerError({
      requestId,
      code: "INTERNAL",
      message: "Weekly digest cron failed",
      error,
    });
    return fail(requestId, "INTERNAL", "Weekly digest cron failed", undefined, 500);
  }
}
