"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CLEANUP_QUERY_KEYS = [
  "cleanupRun",
  "cleanupScanned",
  "cleanupDeleted",
  "cleanupFailed",
  "cleanupMessage",
] as const;

export function AutoClearCleanupStatus({ delayMs = 10000 }: { delayMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cleanupRun = searchParams.get("cleanupRun");

  useEffect(() => {
    if (!cleanupRun) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of CLEANUP_QUERY_KEYS) {
        params.delete(key);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
      router.refresh();
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [cleanupRun, delayMs, pathname, router, searchParams]);

  return null;
}
