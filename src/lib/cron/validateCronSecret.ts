import { env } from "@/lib/env";
import { fail } from "@/lib/http/responses";

export function validateCronSecret(req: Request, requestId: string) {
  if (!env.CRON_SECRET) {
    return fail(requestId, "FORBIDDEN", "Cron secret is not configured", undefined, 403);
  }

  const headerSecret = req.headers.get("x-cron-secret");
  const authorization = req.headers.get("authorization") ?? "";
  const bearerSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

  const isValid = headerSecret === env.CRON_SECRET || bearerSecret === env.CRON_SECRET;
  if (!isValid) {
    return fail(requestId, "FORBIDDEN", "Invalid cron secret", undefined, 403);
  }

  return null;
}
