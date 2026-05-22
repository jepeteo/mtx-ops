import { z } from "zod";
import { requireRoleApi } from "@/lib/auth/guards";
import { assertRateLimit } from "@/lib/auth/rateLimit";
import { logActivity } from "@/lib/activity/logActivity";
import { db } from "@/lib/db/db";
import { revealSecret } from "@/lib/vaultwarden/client";
import { fail, logServerError, ok } from "@/lib/http/responses";

const Schema = z.object({
  vaultItemId: z.string().min(1),
  fieldName: z.string().min(1),
  clientId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = await assertRateLimit({
    scope: "vault-reveal",
    identifier: `${auth.session.userId}|${sourceIp}`,
    maxRequests: 30,
    windowSec: 15 * 60,
  });
  if (rate.limited) {
    return fail(auth.requestId, "RATE_LIMITED", "Too many reveal attempts. Try again later.", undefined, 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid vault reveal payload", parsed.error.flatten(), 400);
  }

  const pointer = await db.vaultPointer.findFirst({
    where: {
      vaultItemId: parsed.data.vaultItemId,
      fieldName: parsed.data.fieldName,
      clientId: parsed.data.clientId,
      client: { workspaceId: auth.session.workspaceId },
    },
    select: { id: true },
  });

  if (!pointer) {
    return fail(auth.requestId, "FORBIDDEN", "No vault pointer authorizes this reveal", undefined, 403);
  }

  try {
    const { value } = await revealSecret({ vaultItemId: parsed.data.vaultItemId, fieldName: parsed.data.fieldName });

    await logActivity({
      workspaceId: auth.session.workspaceId,
      actorId: auth.session.userId,
      action: "vault.reveal",
      entityType: "Client",
      entityId: parsed.data.clientId,
      metadata: { vaultItemId: parsed.data.vaultItemId, fieldName: parsed.data.fieldName },
    });

    return ok(auth.requestId, { value });
  } catch (error) {
    logServerError({
      requestId: auth.requestId,
      code: "UPSTREAM_UNAVAILABLE",
      message: "Vault reveal failed",
      error,
    });

    return fail(auth.requestId, "UPSTREAM_UNAVAILABLE", "Vault currently unavailable", undefined, 502);
  }
}
