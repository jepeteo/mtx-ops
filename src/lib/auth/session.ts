import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { SessionPayload, Role } from "./types";
import type { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { z } from "zod";

type CreateSessionInput = {
  userId: string;
  userEmail: string;
  role: Role;
  workspaceId: string;
};

const encoder = new TextEncoder();

const SessionIdentitySchema = z.object({
  userId: z.string().min(1),
  userEmail: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  workspaceId: z.string().min(1),
});

export type SessionIdentity = z.infer<typeof SessionIdentitySchema>;

export async function createSessionToken(input: CreateSessionInput) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + env.AUTH_SESSION_DAYS * 24 * 60 * 60;

  return new SignJWT({ ...input })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(encoder.encode(env.AUTH_JWT_SECRET));
}

export function setSessionCookieWithToken(res: NextResponse, token: string) {
  res.cookies.set(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.AUTH_SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(env.AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const separatorIndex = value.indexOf("=");
        if (separatorIndex === -1) {
          return [decodeURIComponent(value), ""];
        }

        const key = decodeURIComponent(value.slice(0, separatorIndex));
        const cookieValue = decodeURIComponent(value.slice(separatorIndex + 1));
        return [key, cookieValue];
      }),
  );
}

export async function verifySessionToken(token: string): Promise<SessionIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(env.AUTH_JWT_SECRET));
    const parsed = SessionIdentitySchema.safeParse(payload);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Omit<SessionPayload, "iat" | "exp"> | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<Omit<SessionPayload, "iat" | "exp"> | null> {
  const token = req.cookies.get(env.AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionFromApiRequest(req: Request): Promise<SessionIdentity | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const parsedCookies = parseCookieHeader(cookieHeader);
  const token = parsedCookies[env.AUTH_COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}
