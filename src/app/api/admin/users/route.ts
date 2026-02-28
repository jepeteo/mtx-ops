import { z } from "zod";
import { db } from "@/lib/db/db";
import { requireRoleApi } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { fail, ok } from "@/lib/http/responses";
import { logActivity } from "@/lib/activity/logActivity";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  password: z.string().min(8).max(128),
});

export async function GET(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const users = await db.user.findMany({
    where: { workspaceId: auth.session.workspaceId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(auth.requestId, { users });
}

export async function POST(req: Request) {
  const auth = await requireRoleApi(req, "ADMIN");
  if ("errorResponse" in auth) return auth.errorResponse;

  const payload = await req.json().catch(() => null);
  const parsed = CreateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(auth.requestId, "VALIDATION_ERROR", "Invalid user payload", parsed.error.flatten(), 400);
  }

  if (auth.session.role === "ADMIN" && parsed.data.role === "OWNER") {
    return fail(auth.requestId, "FORBIDDEN", "Admins cannot create Owner users", undefined, 403);
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existing) {
    return fail(auth.requestId, "CONFLICT", "A user with that email already exists", { email: normalizedEmail }, 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await db.user.create({
    data: {
      workspaceId: auth.session.workspaceId,
      email: normalizedEmail,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  await logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "user.create",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role, email: user.email },
  });

  return ok(auth.requestId, { user }, { status: 201 });
}
