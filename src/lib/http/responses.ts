
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "UPSTREAM_UNAVAILABLE";

export type ErrorEnvelope = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId: string;
  };
};

export type OkEnvelope<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function ok<T>(requestId: string, data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data, requestId } as OkEnvelope<T>, init);
}

export function fail(
  requestId: string,
  code: ErrorCode,
  message: string,
  details?: unknown,
  status = 400,
) {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
        requestId,
      },
    },
    { status },
  );
}

export function logServerError(params: {
  requestId: string;
  code: ErrorCode;
  message: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    level: "error",
    requestId: params.requestId,
    code: params.code,
    message: params.message,
    metadata: params.metadata,
    error: params.error instanceof Error ? params.error.message : String(params.error ?? "unknown"),
  };

  console.error(JSON.stringify(payload));
}
