import { requireRoleApi } from "@/lib/auth/guards";
import { assertRateLimit } from "@/lib/auth/rateLimit";
import { db } from "@/lib/db/db";
import { fail, logServerError } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

export async function GET(req: Request) {
  const auth = await requireRoleApi(req, "OWNER");
  if ("errorResponse" in auth) return auth.errorResponse;

  const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = await assertRateLimit({
    scope: "export-workspace",
    identifier: `${auth.session.userId}|${sourceIp}`,
    maxRequests: 3,
    windowSec: 60 * 60,
  });
  if (rate.limited) {
    return fail(auth.requestId, "RATE_LIMITED", "Export rate limit exceeded. Try again later.", undefined, 429);
  }

  try {
    const workspaceId = auth.session.workspaceId;

    const [
      workspace,
      users,
      clients,
      services,
      contacts,
      agencyServices,
      clientMemberAccess,
      assetLinks,
      projects,
      milestones,
      tasks,
      taskDependencies,
      notes,
      decisions,
      handovers,
      attachments,
      attachmentLinks,
      vaultPointers,
      notifications,
      activityLog,
    ] = await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.user.findMany({
        where: { workspaceId },
        select: {
          id: true,
          workspaceId: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.client.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.service.findMany({
        where: { client: { workspaceId } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.contact.findMany({
        where: { client: { workspaceId } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.agencyService.findMany({
        where: { client: { workspaceId } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.clientMemberAccess.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.assetLink.findMany({
        where: { client: { workspaceId } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.project.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.milestone.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.task.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.taskDependency.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.note.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.decision.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.handover.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.attachment.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.attachmentLink.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.vaultPointer.findMany({
        where: { client: { workspaceId } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.notification.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      db.activityLog.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);

    if (!workspace) {
      return fail(auth.requestId, "NOT_FOUND", "Workspace not found", { workspaceId }, 404);
    }

    await logActivity({
      workspaceId,
      actorId: auth.session.userId,
      action: "workspace.export",
      entityType: "Workspace",
      entityId: workspaceId,
      metadata: {
        exportType: "json",
      },
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      requestId: auth.requestId,
      workspace,
      users,
      clients,
      services,
      contacts,
      agencyServices,
      clientMemberAccess,
      assetLinks,
      projects,
      milestones,
      tasks,
      taskDependencies,
      notes,
      decisions,
      handovers,
      attachments,
      attachmentLinks,
      vaultPointers,
      notifications,
      activityLog,
    };

    const fileDate = new Date().toISOString().slice(0, 10);

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename=workspace-export-${fileDate}.json`,
      },
    });
  } catch (error) {
    logServerError({
      requestId: auth.requestId,
      code: "INTERNAL",
      message: "Workspace export failed",
      error,
    });
    return fail(auth.requestId, "INTERNAL", "Workspace export failed", undefined, 500);
  }
}
