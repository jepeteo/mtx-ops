import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/cron/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (!isPublicApi) {
      const session = await getSessionFromRequest(req);
      if (!session) {
        return NextResponse.json(
          {
            ok: false,
            error: { code: "UNAUTHORIZED", message: "Authentication required" },
          },
          { status: 401 },
        );
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    const session = await getSessionFromRequest(req);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      const nextPath = pathname + req.nextUrl.search;
      if (nextPath.startsWith("/app")) {
        url.searchParams.set("next", nextPath);
      }
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
