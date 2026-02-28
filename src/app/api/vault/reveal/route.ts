import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity/logActivity";
import { revealSecret } from "@/lib/vaultwarden/client";
import { fail, logServerError, ok } from "@/lib/http/responses";

const Schema = z.object({
  vaultItemId: z.string().min(1),
  fieldName: z.string().min(1),
  clientId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid vault reveal payload", parsed.error.flatten(), 400);
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
