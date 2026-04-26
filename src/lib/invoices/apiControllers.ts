import { InvoiceStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import {
  MarkPaidSchema,
  MarkSentSchema,
  MarkVoidSchema,
  UpdateInvoiceSchema,
  buildInvoiceTotals,
  assertTransition,
  toApiInvoice,
  CreateInvoiceSchema,
  InvoiceStatusFilterSchema,
  computeStoredLineTotals,
  reserveInvoiceNumber,
  InvoiceLineInputSchema,
} from "@/lib/invoices/service";
import { mapInvoiceToPdfData, renderInvoicePdfBuffer, safeInvoiceAttachmentFilename } from "@/lib/invoices/pdf";
import { INVOICE_SEND_EMAIL_ROUTE_KEY, SendInvoiceEmailBodySchema } from "@/lib/invoices/service";
import { computeInvoiceEmailRequestFingerprint } from "@/lib/invoices/emailFingerprint";
import { getResendInvoiceConfigFromEnv, sendInvoiceEmailWithResend } from "@/lib/invoices/resendInvoiceEmail";

type ApiDeps = {
  requireAuthApi: (req: Request) => Promise<
    | { errorResponse: Response }
    | {
        requestId: string;
        session: { userId: string; workspaceId: string; userEmail: string; role: string };
      }
  >;
  db: {
    client: { findFirst: (...args: any[]) => Promise<any> };
    invoice: {
      findMany: (...args: any[]) => Promise<any[]>;
      findFirst: (...args: any[]) => Promise<any>;
      findFirstOrThrow: (...args: any[]) => Promise<any>;
      create: (...args: any[]) => Promise<any>;
      update: (...args: any[]) => Promise<any>;
    };
    invoiceLineItem: {
      createMany: (...args: any[]) => Promise<any>;
      findFirst: (...args: any[]) => Promise<any>;
      findMany: (...args: any[]) => Promise<any[]>;
      create: (...args: any[]) => Promise<any>;
      update: (...args: any[]) => Promise<any>;
      delete: (...args: any[]) => Promise<any>;
    };
    idempotencyRecord: {
      findUnique: (...args: any[]) => Promise<any>;
      create: (...args: any[]) => Promise<any>;
    };
    $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  };
  logActivity: (input: any) => Promise<void>;
  fail: (requestId: string, code: any, message: string, details?: unknown, status?: number) => Response;
  ok: <T>(requestId: string, data: T, init?: ResponseInit) => Response;
  renderInvoicePdfBuffer?: typeof renderInvoicePdfBuffer;
  getResendInvoiceConfig?: () => { apiKey: string; from: string } | null;
  sendResendInvoiceEmail?: typeof sendInvoiceEmailWithResend;
};

type EmailSendSnapshotV1 = {
  v: 1;
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  sentAt: string | null;
  recipientEmail: string;
  resendMessageId: string;
  idempotentReplay: boolean;
};

type RouteParams = { id: string };
const UuidSchema = z.string().uuid();

export async function listInvoicesController(req: Request, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const requestUrl = new URL(req.url);
  const clientIdRaw = requestUrl.searchParams.get("clientId");
  const statusRaw = requestUrl.searchParams.get("status");
  const overdueOnlyRaw = requestUrl.searchParams.get("overdueOnly");
  const fromRaw = requestUrl.searchParams.get("from");
  const toRaw = requestUrl.searchParams.get("to");

  if (clientIdRaw && !UuidSchema.safeParse(clientIdRaw).success) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid clientId filter", { clientId: clientIdRaw }, 400);
  }

  const statusParsed = statusRaw ? InvoiceStatusFilterSchema.safeParse(statusRaw) : null;
  if (statusRaw && (!statusParsed || !statusParsed.success)) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid invoice status filter", { status: statusRaw }, 400);
  }

  const overdueOnly = overdueOnlyRaw ? ["1", "true", "yes"].includes(overdueOnlyRaw.toLowerCase()) : false;
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;

  if ((fromRaw && Number.isNaN(fromDate?.getTime())) || (toRaw && Number.isNaN(toDate?.getTime()))) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid date filter", { from: fromRaw, to: toRaw }, 400);
  }

  const now = new Date();
  const selectedStatus = statusParsed?.success ? statusParsed.data : null;
  const invoices = await deps.db.invoice.findMany({
    where: {
      workspaceId: auth.session.workspaceId,
      ...(clientIdRaw ? { clientId: clientIdRaw } : {}),
      ...(fromDate || toDate
        ? {
            issueDate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...((selectedStatus === "overdue" || overdueOnly)
        ? { status: "sent", dueDate: { lt: now } }
        : selectedStatus
          ? { status: selectedStatus }
          : {}),
    },
    include: {
      client: { select: { id: true, name: true } },
      lineItems: { select: { id: true } },
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return deps.ok(auth.requestId, {
    invoices: invoices.map((invoice) => ({
      ...toApiInvoice(invoice),
      client: invoice.client,
      lineItemsCount: invoice.lineItems.length,
    })),
  });
}

export async function createInvoiceController(req: Request, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = CreateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid invoice payload", parsed.error.flatten(), 400);
  }

  const client = await deps.db.client.findFirst({
    where: { id: parsed.data.clientId, workspaceId: auth.session.workspaceId },
    select: { id: true },
  });
  if (!client) {
    return deps.fail(auth.requestId, "NOT_FOUND", "Client not found", { clientId: parsed.data.clientId }, 404);
  }

  try {
    const created = await deps.db.$transaction(async (tx) => {
      const issueDate = new Date(parsed.data.issueDate);
      const dueDate = new Date(parsed.data.dueDate);
      const invoiceNumber = await reserveInvoiceNumber({
        tx,
        workspaceId: auth.session.workspaceId,
        issueDate,
      });

      const lineItemsData = parsed.data.lineItems.map((line, index) => {
        const computed = computeStoredLineTotals(line);
        return {
          position: index + 1,
          description: line.description,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          taxMode: line.taxMode,
          taxRateBps: line.taxRateBps ?? 0,
          lineSubtotalMinor: computed.lineSubtotalMinor,
          lineTaxMinor: computed.lineTaxMinor,
          lineTotalMinor: computed.lineTotalMinor,
        };
      });

      const totals = buildInvoiceTotals(
        lineItemsData.map((line) => ({
          lineSubtotalMinor: line.lineSubtotalMinor,
          lineTaxMinor: line.lineTaxMinor,
          lineTotalMinor: line.lineTotalMinor,
        })),
      );

      const invoice = await tx.invoice.create({
        data: {
          workspaceId: auth.session.workspaceId,
          clientId: parsed.data.clientId,
          invoiceNumber,
          status: "draft",
          currency: parsed.data.currency.toUpperCase(),
          issueDate,
          dueDate,
          billingRecipient: parsed.data.billingRecipient ?? null,
          billingEmail: parsed.data.billingEmail ?? null,
          notes: parsed.data.notes ?? null,
          paymentTerms: parsed.data.paymentTerms ?? null,
          subtotalMinor: totals.subtotalMinor,
          taxMinor: totals.taxMinor,
          totalMinor: totals.totalMinor,
          amountPaidMinor: 0,
        },
      });

      if (lineItemsData.length > 0) {
        await tx.invoiceLineItem.createMany({
          data: lineItemsData.map((line) => ({ invoiceId: invoice.id, ...line })),
        });
      }

      return tx.invoice.findFirstOrThrow({
        where: { id: invoice.id, workspaceId: auth.session.workspaceId },
        include: {
          lineItems: { orderBy: { position: "asc" } },
          client: { select: { id: true, name: true } },
        },
      });
    });

    await deps.logActivity({
      workspaceId: auth.session.workspaceId,
      actorId: auth.session.userId,
      action: "invoice.create",
      entityType: "Invoice",
      entityId: created.id,
      metadata: {
        clientId: created.clientId,
        invoiceNumber: created.invoiceNumber,
        status: created.status,
        totalMinor: created.totalMinor,
      },
    });

    return deps.ok(
      auth.requestId,
      { invoice: { ...toApiInvoice(created), client: created.client, lineItems: created.lineItems } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return deps.fail(auth.requestId, "CONFLICT", "Invoice number conflict", undefined, 409);
    }
    return deps.fail(auth.requestId, "INTERNAL", "Failed to create invoice", undefined, 500);
  }
}

async function getScopedInvoice(id: string, workspaceId: string, db: ApiDeps["db"]) {
  return db.invoice.findFirst({
    where: { id, workspaceId },
    include: {
      client: { select: { id: true, name: true } },
      lineItems: { orderBy: { position: "asc" } },
    },
  });
}

export async function getInvoiceController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const invoice = await getScopedInvoice(params.id, auth.session.workspaceId, deps.db);
  if (!invoice) {
    return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);
  }
  return deps.ok(auth.requestId, { invoice: { ...toApiInvoice(invoice), client: invoice.client, lineItems: invoice.lineItems } });
}

export async function downloadInvoicePdfController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const invoice = await getScopedInvoice(params.id, auth.session.workspaceId, deps.db);
  if (!invoice) {
    return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);
  }

  const renderPdf = deps.renderInvoicePdfBuffer ?? renderInvoicePdfBuffer;
  const pdfBuffer = await renderPdf(mapInvoiceToPdfData(invoice));

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.pdf.download",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      lineItemsCount: invoice.lineItems.length,
    },
  });

  const safeName = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
  return new Response(Uint8Array.from(pdfBuffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeName}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}

function parseEmailSendSnapshotV1(raw: unknown): EmailSendSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.invoiceId !== "string") return null;
  if (typeof o.invoiceNumber !== "string") return null;
  const st = o.status;
  if (st !== "draft" && st !== "sent" && st !== "paid" && st !== "void") return null;
  if (typeof o.recipientEmail !== "string") return null;
  if (typeof o.resendMessageId !== "string") return null;
  if (typeof o.idempotentReplay !== "boolean") return null;
  const sentAt = o.sentAt === null || typeof o.sentAt === "string" ? (o.sentAt as string | null) : null;
  return {
    v: 1,
    invoiceId: o.invoiceId,
    invoiceNumber: o.invoiceNumber,
    status: st,
    sentAt,
    recipientEmail: o.recipientEmail,
    resendMessageId: o.resendMessageId,
    idempotentReplay: o.idempotentReplay,
  };
}

export async function sendInvoiceEmailController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const idempotencyKey = req.headers.get("idempotency-key")?.trim() ?? "";
  if (!idempotencyKey) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Idempotency-Key header is required", { header: "Idempotency-Key" }, 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = SendInvoiceEmailBodySchema.safeParse(body);
  if (!parsed.success) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid send-email payload", parsed.error.flatten(), 400);
  }

  const recipientEmail = parsed.data.recipientEmail;

  const invoice = await getScopedInvoice(params.id, auth.session.workspaceId, deps.db);
  if (!invoice) {
    return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);
  }

  if (invoice.status === "void") {
    return deps.fail(auth.requestId, "CONFLICT", "Cannot email a void invoice", { status: invoice.status }, 409);
  }

  const fingerprint = computeInvoiceEmailRequestFingerprint(invoice.id, recipientEmail);

  const existingIdem = await deps.db.idempotencyRecord.findUnique({
    where: {
      workspaceId_routeKey_idempotencyKey: {
        workspaceId: auth.session.workspaceId,
        routeKey: INVOICE_SEND_EMAIL_ROUTE_KEY,
        idempotencyKey,
      },
    },
  });

  if (existingIdem) {
    if (existingIdem.requestFingerprint !== fingerprint) {
      return deps.fail(
        auth.requestId,
        "CONFLICT",
        "Idempotency key was already used for a different request",
        { idempotencyKey },
        409,
      );
    }
    const snap = parseEmailSendSnapshotV1(existingIdem.responseSnapshot);
    if (!snap) {
      return deps.fail(auth.requestId, "INTERNAL", "Invalid idempotency snapshot", undefined, 500);
    }
    const fresh = await getScopedInvoice(invoice.id, auth.session.workspaceId, deps.db);
    if (!fresh) {
      return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);
    }
    return deps.ok(auth.requestId, {
      invoice: { ...toApiInvoice(fresh), client: fresh.client, lineItems: fresh.lineItems },
      email: {
        recipientEmail: snap.recipientEmail,
        resendMessageId: snap.resendMessageId,
        idempotentReplay: true,
      },
    });
  }

  if (invoice.status === "draft") {
    try {
      buildInvoiceTotals(
        invoice.lineItems.map((line: { lineSubtotalMinor: number; lineTaxMinor: number; lineTotalMinor: number }) => ({
          lineSubtotalMinor: line.lineSubtotalMinor,
          lineTaxMinor: line.lineTaxMinor,
          lineTotalMinor: line.lineTotalMinor,
        })),
        true,
      );
    } catch (error) {
      return deps.fail(
        auth.requestId,
        "CONFLICT",
        error instanceof Error ? error.message : "Invoice total is invalid",
        undefined,
        409,
      );
    }
  }

  const getConfig = deps.getResendInvoiceConfig ?? getResendInvoiceConfigFromEnv;
  const config = getConfig();
  if (!config) {
    await deps.logActivity({
      workspaceId: auth.session.workspaceId,
      actorId: auth.session.userId,
      action: "invoice.email.send_failed",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { reason: "missing_resend_or_from_env" },
    });
    return deps.fail(
      auth.requestId,
      "CONFIG_ERROR",
      "Email sending is not configured (RESEND_API_KEY and INVOICE_EMAIL_FROM required)",
      undefined,
      503,
    );
  }

  const renderPdf = deps.renderInvoicePdfBuffer ?? renderInvoicePdfBuffer;
  let pdfBuffer: Uint8Array;
  try {
    const buf = await renderPdf(mapInvoiceToPdfData(invoice));
    pdfBuffer = Uint8Array.from(buf);
  } catch {
    await deps.logActivity({
      workspaceId: auth.session.workspaceId,
      actorId: auth.session.userId,
      action: "invoice.email.send_failed",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { reason: "pdf_render_failed" },
    });
    return deps.fail(auth.requestId, "INTERNAL", "Failed to render invoice PDF", undefined, 500);
  }

  const subject = `Invoice ${invoice.invoiceNumber} from MTX Studio`;
  const attachmentFilename = safeInvoiceAttachmentFilename(invoice.invoiceNumber);
  const textBody = `Please find invoice ${invoice.invoiceNumber} attached as a PDF.\n\nThank you,\nMTX Studio`;

  const send = deps.sendResendInvoiceEmail ?? sendInvoiceEmailWithResend;
  const sendResult = await send({
    apiKey: config.apiKey,
    from: config.from,
    to: recipientEmail,
    subject,
    textBody,
    pdfBuffer,
    attachmentFilename,
  });

  if ("error" in sendResult) {
    await deps.logActivity({
      workspaceId: auth.session.workspaceId,
      actorId: auth.session.userId,
      action: "invoice.email.send_failed",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { reason: "resend_error", message: String(sendResult.error).slice(0, 200) },
    });
    return deps.fail(auth.requestId, "UPSTREAM_UNAVAILABLE", "Failed to send invoice email", { provider: "resend" }, 502);
  }

  const messageId = sendResult.messageId;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  let updated: NonNullable<Awaited<ReturnType<ApiDeps["db"]["invoice"]["findFirst"]>>> | null;
  try {
    updated = await deps.db.$transaction(async (tx) => {
      if (invoice.status === "draft") {
        const totals = buildInvoiceTotals(
          invoice.lineItems.map((line: { lineSubtotalMinor: number; lineTaxMinor: number; lineTotalMinor: number }) => ({
            lineSubtotalMinor: line.lineSubtotalMinor,
            lineTaxMinor: line.lineTaxMinor,
            lineTotalMinor: line.lineTotalMinor,
          })),
          true,
        );
        const inv = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            subtotalMinor: totals.subtotalMinor,
            taxMinor: totals.taxMinor,
            totalMinor: totals.totalMinor,
          },
          include: {
            lineItems: { orderBy: { position: "asc" } },
            client: { select: { id: true, name: true } },
          },
        });

        const snapshot: EmailSendSnapshotV1 = {
          v: 1,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          sentAt: inv.sentAt?.toISOString() ?? null,
          recipientEmail,
          resendMessageId: messageId,
          idempotentReplay: false,
        };

        await tx.idempotencyRecord.create({
          data: {
            workspaceId: auth.session.workspaceId,
            routeKey: INVOICE_SEND_EMAIL_ROUTE_KEY,
            idempotencyKey,
            requestFingerprint: fingerprint,
            responseSnapshot: snapshot,
            expiresAt,
          },
        });

        return inv;
      }

      const reloaded = await tx.invoice.findFirst({
        where: { id: invoice.id, workspaceId: auth.session.workspaceId },
        include: {
          lineItems: { orderBy: { position: "asc" } },
          client: { select: { id: true, name: true } },
        },
      });
      if (!reloaded) {
        return null;
      }

      const snapshot: EmailSendSnapshotV1 = {
        v: 1,
        invoiceId: reloaded.id,
        invoiceNumber: reloaded.invoiceNumber,
        status: reloaded.status,
        sentAt: reloaded.sentAt?.toISOString() ?? null,
        recipientEmail,
        resendMessageId: messageId,
        idempotentReplay: false,
      };

      await tx.idempotencyRecord.create({
        data: {
          workspaceId: auth.session.workspaceId,
          routeKey: INVOICE_SEND_EMAIL_ROUTE_KEY,
          idempotencyKey,
          requestFingerprint: fingerprint,
          responseSnapshot: snapshot,
          expiresAt,
        },
      });

      return reloaded;
    });
  } catch (error) {
    // Email may have been delivered even if the DB write failed; do not use invoice.email.send_failed here.
    return deps.fail(
      auth.requestId,
      "INTERNAL",
      error instanceof Error ? error.message : "Failed to record invoice email send",
      undefined,
      500,
    );
  }

  if (!updated) {
    return deps.fail(auth.requestId, "INTERNAL", "Invoice not found after send", { invoiceId: params.id }, 500);
  }

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.email.send",
    entityType: "Invoice",
    entityId: updated.id,
    metadata: {
      recipientEmail,
      resendMessageId: messageId,
      invoiceNumber: updated.invoiceNumber,
      status: updated.status,
    },
  });

  return deps.ok(auth.requestId, {
    invoice: { ...toApiInvoice(updated), client: updated.client, lineItems: updated.lineItems },
    email: {
      recipientEmail,
      resendMessageId: messageId,
      idempotentReplay: false,
    },
  });
}

export async function patchInvoiceController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const existing = await getScopedInvoice(params.id, auth.session.workspaceId, deps.db);
  if (!existing) {
    return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);
  }
  if (existing.status !== "draft") {
    return deps.fail(auth.requestId, "CONFLICT", "Financial edits are allowed only for draft invoices", undefined, 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid invoice payload", parsed.error.flatten(), 400);
  }

  const totals = buildInvoiceTotals(
    existing.lineItems.map((line: { lineSubtotalMinor: number; lineTaxMinor: number; lineTotalMinor: number }) => ({
      lineSubtotalMinor: line.lineSubtotalMinor,
      lineTaxMinor: line.lineTaxMinor,
      lineTotalMinor: line.lineTotalMinor,
    })),
  );

  const updated = await deps.db.invoice.update({
    where: { id: existing.id },
    data: {
      currency: parsed.data.currency?.toUpperCase(),
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : undefined,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      billingRecipient: parsed.data.billingRecipient !== undefined ? (parsed.data.billingRecipient ?? null) : undefined,
      billingEmail: parsed.data.billingEmail !== undefined ? (parsed.data.billingEmail ?? null) : undefined,
      notes: parsed.data.notes !== undefined ? (parsed.data.notes ?? null) : undefined,
      paymentTerms: parsed.data.paymentTerms !== undefined ? (parsed.data.paymentTerms ?? null) : undefined,
      subtotalMinor: totals.subtotalMinor,
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
    },
    include: {
      client: { select: { id: true, name: true } },
      lineItems: { orderBy: { position: "asc" } },
    },
  });

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.update",
    entityType: "Invoice",
    entityId: updated.id,
    metadata: {
      previous: { currency: existing.currency, issueDate: existing.issueDate.toISOString(), dueDate: existing.dueDate.toISOString() },
      next: { currency: updated.currency, issueDate: updated.issueDate.toISOString(), dueDate: updated.dueDate.toISOString() },
    },
  });

  return deps.ok(auth.requestId, { invoice: { ...toApiInvoice(updated), client: updated.client, lineItems: updated.lineItems } });
}

export async function markSentController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const existing = await getScopedInvoice(params.id, auth.session.workspaceId, deps.db);
  if (!existing) return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);

  const body = await req.json().catch(() => ({}));
  const parsed = MarkSentSchema.safeParse(body);
  if (!parsed.success) return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid mark-sent payload", parsed.error.flatten(), 400);

  try {
    assertTransition(existing.status, InvoiceStatus.sent);
  } catch (error) {
    return deps.fail(auth.requestId, "CONFLICT", error instanceof Error ? error.message : "Invalid transition", undefined, 409);
  }

  let totals: { subtotalMinor: number; taxMinor: number; totalMinor: number };
  try {
    totals = buildInvoiceTotals(
      existing.lineItems.map((line: { lineSubtotalMinor: number; lineTaxMinor: number; lineTotalMinor: number }) => ({
        lineSubtotalMinor: line.lineSubtotalMinor,
        lineTaxMinor: line.lineTaxMinor,
        lineTotalMinor: line.lineTotalMinor,
      })),
      true,
    );
  } catch (error) {
    return deps.fail(auth.requestId, "CONFLICT", error instanceof Error ? error.message : "Invoice total is invalid", undefined, 409);
  }

  const updated = await deps.db.invoice.update({
    where: { id: existing.id },
    data: {
      status: "sent",
      sentAt: parsed.data.sentAt ? new Date(parsed.data.sentAt) : new Date(),
      subtotalMinor: totals.subtotalMinor,
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
    },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      client: { select: { id: true, name: true } },
    },
  });

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.status.sent",
    entityType: "Invoice",
    entityId: updated.id,
    metadata: {
      previousStatus: existing.status,
      nextStatus: updated.status,
      totalMinor: updated.totalMinor,
      sentAt: updated.sentAt?.toISOString() ?? null,
    },
  });

  return deps.ok(auth.requestId, { invoice: { ...toApiInvoice(updated), client: updated.client, lineItems: updated.lineItems } });
}

export async function markPaidController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const existing = await getScopedInvoice(params.id, auth.session.workspaceId, deps.db);
  if (!existing) return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);

  const body = await req.json().catch(() => ({}));
  const parsed = MarkPaidSchema.safeParse(body);
  if (!parsed.success) return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid mark-paid payload", parsed.error.flatten(), 400);

  try {
    assertTransition(existing.status, InvoiceStatus.paid);
  } catch (error) {
    return deps.fail(auth.requestId, "CONFLICT", error instanceof Error ? error.message : "Invalid transition", undefined, 409);
  }

  const amountPaidMinor = parsed.data.amountPaidMinor ?? existing.totalMinor;
  if (amountPaidMinor !== existing.totalMinor) {
    return deps.fail(
      auth.requestId,
      "VALIDATION_ERROR",
      "amountPaidMinor must equal invoice total for paid status in V1",
      { amountPaidMinor, totalMinor: existing.totalMinor },
      400,
    );
  }

  const updated = await deps.db.invoice.update({
    where: { id: existing.id },
    data: {
      status: "paid",
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
      amountPaidMinor,
    },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      client: { select: { id: true, name: true } },
    },
  });

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.status.paid",
    entityType: "Invoice",
    entityId: updated.id,
    metadata: {
      previousStatus: existing.status,
      nextStatus: updated.status,
      amountPaidMinor: updated.amountPaidMinor,
      paidAt: updated.paidAt?.toISOString() ?? null,
    },
  });

  return deps.ok(auth.requestId, { invoice: { ...toApiInvoice(updated), client: updated.client, lineItems: updated.lineItems } });
}

export async function markVoidController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const existing = await getScopedInvoice(params.id, auth.session.workspaceId, deps.db);
  if (!existing) return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);

  const body = await req.json().catch(() => ({}));
  const parsed = MarkVoidSchema.safeParse(body);
  if (!parsed.success) return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid mark-void payload", parsed.error.flatten(), 400);

  try {
    assertTransition(existing.status, InvoiceStatus.void);
  } catch (error) {
    return deps.fail(auth.requestId, "CONFLICT", error instanceof Error ? error.message : "Invalid transition", undefined, 409);
  }

  const updated = await deps.db.invoice.update({
    where: { id: existing.id },
    data: {
      status: "void",
      voidedAt: new Date(),
    },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      client: { select: { id: true, name: true } },
    },
  });

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.status.void",
    entityType: "Invoice",
    entityId: updated.id,
    metadata: {
      previousStatus: existing.status,
      nextStatus: updated.status,
      reason: parsed.data.reason ?? null,
      voidedAt: updated.voidedAt?.toISOString() ?? null,
    },
  });

  return deps.ok(auth.requestId, { invoice: { ...toApiInvoice(updated), client: updated.client, lineItems: updated.lineItems } });
}

async function recalculateInvoiceTotalsInTransaction(tx: any, invoiceId: string) {
  const lineItems = await tx.invoiceLineItem.findMany({
    where: { invoiceId },
    orderBy: { position: "asc" },
  });

  const totals = buildInvoiceTotals(
    lineItems.map((line: any) => ({
      lineSubtotalMinor: line.lineSubtotalMinor,
      lineTaxMinor: line.lineTaxMinor,
      lineTotalMinor: line.lineTotalMinor,
    })),
  );

  return tx.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotalMinor: totals.subtotalMinor,
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
    },
    include: {
      client: { select: { id: true, name: true } },
      lineItems: { orderBy: { position: "asc" } },
    },
  });
}

export async function createInvoiceLineItemController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const invoice = await getScopedInvoice(params.id, auth.session.workspaceId, deps.db);
  if (!invoice) {
    return deps.fail(auth.requestId, "NOT_FOUND", "Invoice not found", { invoiceId: params.id }, 404);
  }
  if (invoice.status !== "draft") {
    return deps.fail(auth.requestId, "CONFLICT", "Line item mutations are allowed only for draft invoices", undefined, 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = InvoiceLineInputSchema.safeParse(body);
  if (!parsed.success) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid line item payload", parsed.error.flatten(), 400);
  }

  const computed = computeStoredLineTotals(parsed.data);
  const created = await deps.db.$transaction(async (tx) => {
    const last = await tx.invoiceLineItem.findFirst({
      where: { invoiceId: invoice.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const createdLineItem = await tx.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        position: (last?.position ?? 0) + 1,
        description: parsed.data.description,
        quantity: parsed.data.quantity,
        unitPriceMinor: parsed.data.unitPriceMinor,
        taxMode: parsed.data.taxMode,
        taxRateBps: parsed.data.taxRateBps ?? 0,
        lineSubtotalMinor: computed.lineSubtotalMinor,
        lineTaxMinor: computed.lineTaxMinor,
        lineTotalMinor: computed.lineTotalMinor,
      },
    });

    const updatedInvoice = await recalculateInvoiceTotalsInTransaction(tx, invoice.id);
    return { createdLineItem, updatedInvoice };
  });

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.line_item.create",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: {
      lineItemId: created.createdLineItem.id,
      position: created.createdLineItem.position,
      unitPriceMinor: created.createdLineItem.unitPriceMinor,
      quantity: created.createdLineItem.quantity.toString(),
    },
  });

  return deps.ok(auth.requestId, {
    invoice: {
      ...toApiInvoice(created.updatedInvoice),
      client: created.updatedInvoice.client,
      lineItems: created.updatedInvoice.lineItems,
    },
    lineItem: created.createdLineItem,
  });
}

export async function updateInvoiceLineItemController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const existing = await deps.db.invoiceLineItem.findFirst({
    where: {
      id: params.id,
      invoice: {
        workspaceId: auth.session.workspaceId,
      },
    },
    include: {
      invoice: true,
    },
  });

  if (!existing) {
    return deps.fail(auth.requestId, "NOT_FOUND", "Line item not found", { lineItemId: params.id }, 404);
  }
  if (existing.invoice.status !== "draft") {
    return deps.fail(auth.requestId, "CONFLICT", "Line item mutations are allowed only for draft invoices", undefined, 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = InvoiceLineInputSchema.partial()
    .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" })
    .safeParse(body);
  if (!parsed.success) {
    return deps.fail(auth.requestId, "VALIDATION_ERROR", "Invalid line item payload", parsed.error.flatten(), 400);
  }

  const candidate = {
    description: parsed.data.description ?? existing.description,
    quantity: parsed.data.quantity ?? existing.quantity,
    unitPriceMinor: parsed.data.unitPriceMinor ?? existing.unitPriceMinor,
    taxMode: parsed.data.taxMode ?? existing.taxMode,
    taxRateBps: parsed.data.taxRateBps ?? existing.taxRateBps,
  };
  const computed = computeStoredLineTotals(candidate);

  const updated = await deps.db.$transaction(async (tx) => {
    const updatedLineItem = await tx.invoiceLineItem.update({
      where: { id: existing.id },
      data: {
        description: candidate.description,
        quantity: candidate.quantity,
        unitPriceMinor: candidate.unitPriceMinor,
        taxMode: candidate.taxMode,
        taxRateBps: candidate.taxRateBps,
        lineSubtotalMinor: computed.lineSubtotalMinor,
        lineTaxMinor: computed.lineTaxMinor,
        lineTotalMinor: computed.lineTotalMinor,
      },
    });

    const updatedInvoice = await recalculateInvoiceTotalsInTransaction(tx, existing.invoiceId);
    return { updatedLineItem, updatedInvoice };
  });

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.line_item.update",
    entityType: "Invoice",
    entityId: existing.invoiceId,
    metadata: {
      lineItemId: updated.updatedLineItem.id,
      previous: {
        description: existing.description,
        quantity: existing.quantity.toString(),
        unitPriceMinor: existing.unitPriceMinor,
      },
      next: {
        description: updated.updatedLineItem.description,
        quantity: updated.updatedLineItem.quantity.toString(),
        unitPriceMinor: updated.updatedLineItem.unitPriceMinor,
      },
    },
  });

  return deps.ok(auth.requestId, {
    invoice: {
      ...toApiInvoice(updated.updatedInvoice),
      client: updated.updatedInvoice.client,
      lineItems: updated.updatedInvoice.lineItems,
    },
    lineItem: updated.updatedLineItem,
  });
}

export async function deleteInvoiceLineItemController(req: Request, params: RouteParams, deps: ApiDeps) {
  const auth = await deps.requireAuthApi(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const existing = await deps.db.invoiceLineItem.findFirst({
    where: {
      id: params.id,
      invoice: {
        workspaceId: auth.session.workspaceId,
      },
    },
    include: {
      invoice: true,
    },
  });

  if (!existing) {
    return deps.fail(auth.requestId, "NOT_FOUND", "Line item not found", { lineItemId: params.id }, 404);
  }
  if (existing.invoice.status !== "draft") {
    return deps.fail(auth.requestId, "CONFLICT", "Line item mutations are allowed only for draft invoices", undefined, 409);
  }

  const updated = await deps.db.$transaction(async (tx) => {
    await tx.invoiceLineItem.delete({
      where: { id: existing.id },
    });

    const remaining = await tx.invoiceLineItem.findMany({
      where: { invoiceId: existing.invoiceId },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });

    for (let index = 0; index < remaining.length; index += 1) {
      const item = remaining[index];
      if (!item) {
        continue;
      }
      const expectedPosition = index + 1;
      if (item.position !== expectedPosition) {
        await tx.invoiceLineItem.update({
          where: { id: item.id },
          data: { position: expectedPosition },
        });
      }
    }

    const updatedInvoice = await recalculateInvoiceTotalsInTransaction(tx, existing.invoiceId);
    return { updatedInvoice };
  });

  await deps.logActivity({
    workspaceId: auth.session.workspaceId,
    actorId: auth.session.userId,
    action: "invoice.line_item.delete",
    entityType: "Invoice",
    entityId: existing.invoiceId,
    metadata: {
      lineItemId: existing.id,
      deletedPosition: existing.position,
    },
  });

  return deps.ok(auth.requestId, {
    invoice: {
      ...toApiInvoice(updated.updatedInvoice),
      client: updated.updatedInvoice.client,
      lineItems: updated.updatedInvoice.lineItems,
    },
    deleted: true,
  });
}
