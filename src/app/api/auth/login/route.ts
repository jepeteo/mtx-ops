import { z } from "zod";
import { db } from "@/lib/db/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookieWithToken } from "@/lib/auth/session";
import { fail, getRequestId, logServerError, ok } from "@/lib/http/responses";
import { getRateLimitKey, isLoginRateLimited, recordFailedLogin, resetFailedLogins } from "@/lib/auth/rateLimit";
import { logActivity } from "@/lib/activity/logActivity";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return fail(requestId, "VALIDATION_ERROR", "Invalid email or password payload", parsed.error.flatten(), 400);
  }

  const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = getRateLimitKey(parsed.data.email, sourceIp);
  if (isLoginRateLimited(rateLimitKey)) {
    return fail(requestId, "RATE_LIMITED", "Too many failed login attempts. Please try again later.", undefined, 429);
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.passwordHash) {
    recordFailedLogin(rateLimitKey);
    return fail(requestId, "UNAUTHORIZED", "Invalid credentials", undefined, 401);
  }

  if (user.status !== "ACTIVE") {
    recordFailedLogin(rateLimitKey);
    return fail(requestId, "FORBIDDEN", "User account is disabled", undefined, 403);
  }

  const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordMatches) {
    recordFailedLogin(rateLimitKey);
    return fail(requestId, "UNAUTHORIZED", "Invalid credentials", undefined, 401);
  }

  resetFailedLogins(rateLimitKey);

  const ws = await db.workspace.findFirst({ where: { id: user.workspaceId } });
  if (!ws) {
    logServerError({
      requestId,
      code: "INTERNAL",
      message: "Workspace missing for authenticated user",
      metadata: { userId: user.id, workspaceId: user.workspaceId },
    });
    return fail(requestId, "INTERNAL", "Workspace not found", undefined, 500);
  }

  const token = await createSessionToken({ userId: user.id, userEmail: user.email, role: user.role, workspaceId: user.workspaceId });
  const res = ok(requestId, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    },
  });
  setSessionCookieWithToken(res, token);

  await logActivity({
    workspaceId: user.workspaceId,
    actorId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email },
  });

  return res;
}
