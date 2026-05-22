import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db/db";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createPasswordResetTokenValue() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildPasswordResetUrl(appUrl: string, token: string) {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function issuePasswordResetToken(userId: string) {
  const token = createPasswordResetTokenValue();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await db.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });

  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function findValidPasswordResetToken(token: string) {
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  return db.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          workspaceId: true,
          status: true,
        },
      },
    },
  });
}

export async function consumePasswordResetToken(tokenId: string, userId: string, passwordHash: string) {
  const now = new Date();

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: now },
    }),
    db.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    }),
  ]);
}
