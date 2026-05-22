export function safeAppRedirectPath(next: string | null | undefined, fallback = "/app") {
  if (!next || !next.startsWith("/app") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}
