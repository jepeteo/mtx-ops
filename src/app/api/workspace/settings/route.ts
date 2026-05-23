import { requireRoleApi } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";
import { parseInvoiceIssuerJson } from "@/lib/workspace/invoiceIssuer";
import {
  getIntegrationStatus,
  getWorkspaceSettingsWithDefaults,
  mergeWorkspaceSettings,
  parseWorkspaceSettingsJson,
  PatchWorkspaceSettingsBodySchema,
  settingsPatchSections,
} from "@/lib/workspace/workspaceSettings";

export async function GET(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const workspace = await db.workspace.findFirst({
    where: { id: auth.session.workspaceId },
    select: { name: true, settings: true, invoiceIssuer: true },
  });

  if (!workspace) {
    return fail(auth.requestId, "NOT_FOUND", "Workspace not found", undefined, 404);
  }

  const settings = getWorkspaceSettingsWithDefaults(parseWorkspaceSettingsJson(workspace.settings));

  return ok(auth.requestId, {
    name: workspace.name,
    settings,
    invoiceIssuer: parseInvoiceIssuerJson(workspace.invoiceIssuer),
    integrations: getIntegrationStatus(),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = PatchWorkspaceSettingsBodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid workspace settings payload", parsed.error.flatten(), 400);
  }

  const workspace = await db.workspace.findFirst({
    where: { id: auth.session.workspaceId },
    select: { id: true, name: true, settings: true },
  });

  if (!workspace) {
    return fail(auth.requestId, "NOT_FOUND", "Workspace not found", undefined, 404);
  }

  const updateData: { name?: string; settings?: object } = {};
  let nextName = workspace.name;
  let nextSettings = parseWorkspaceSettingsJson(workspace.settings);

  if (parsed.data.name !== undefined && parsed.data.name !== workspace.name) {
    updateData.name = parsed.data.name;
    nextName = parsed.data.name;
    await logActivity({
      workspaceId: auth.session.workspaceId,
      actorId: auth.session.userId,
      action: "workspace.name.update",
      entityType: "Workspace",
      entityId: workspace.id,
      metadata: { previousName: workspace.name, name: parsed.data.name },
    });
  }

  if (parsed.data.settings) {
    nextSettings = mergeWorkspaceSettings(nextSettings, parsed.data.settings);
    updateData.settings = nextSettings as object;
    await logActivity({
      workspaceId: auth.session.workspaceId,
      actorId: auth.session.userId,
      action: "workspace.settings.update",
      entityType: "Workspace",
      entityId: workspace.id,
      metadata: { sections: settingsPatchSections(parsed.data.settings) },
    });
  }

  if (Object.keys(updateData).length === 0) {
    return fail(auth.requestId, "VALIDATION_ERROR", "No changes to apply", undefined, 400);
  }

  const updated = await db.workspace.update({
    where: { id: workspace.id },
    data: updateData,
    select: { name: true, settings: true, invoiceIssuer: true },
  });

  const settings = getWorkspaceSettingsWithDefaults(parseWorkspaceSettingsJson(updated.settings));

  return ok(auth.requestId, {
    name: nextName,
    settings,
    invoiceIssuer: parseInvoiceIssuerJson(updated.invoiceIssuer),
    integrations: getIntegrationStatus(),
  });
}
