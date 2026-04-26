import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createInvoiceLineItemController,
  deleteInvoiceLineItemController,
  downloadInvoicePdfController,
  getInvoiceController,
  listInvoicesController,
  markSentController,
  patchInvoiceController,
  sendInvoiceEmailController,
  updateInvoiceLineItemController,
} from "./apiControllers";
import { computeInvoiceEmailRequestFingerprint } from "./emailFingerprint";
import { fail, ok } from "@/lib/http/responses";

function makeDeps() {
  return {
    requireAuthApi: vi.fn(),
    logActivity: vi.fn().mockResolvedValue(undefined),
    renderInvoicePdfBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    getResendInvoiceConfig: vi.fn().mockReturnValue({ apiKey: "re_test", from: "invoices@example.com" }),
    sendResendInvoiceEmail: vi.fn().mockResolvedValue({ messageId: "re_abc123" }),
    db: {
      workspace: { findFirst: vi.fn().mockResolvedValue({ name: "Test Workspace", invoiceIssuer: null }) },
      client: { findFirst: vi.fn() },
      invoice: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findFirstOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      invoiceLineItem: {
        createMany: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      idempotencyRecord: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(),
    },
    fail,
    ok,
  };
}

const baseAuth = {
  requestId: "req-1",
  session: { userId: "user-1", workspaceId: "ws-1", userEmail: "x@x.com", role: "OWNER" },
};

const baseInvoice = {
  id: "inv-1",
  workspaceId: "ws-1",
  clientId: "11111111-1111-4111-8111-111111111111",
  invoiceNumber: "MTX-2026-0001",
  status: "draft",
  currency: "GBP",
  issueDate: new Date("2026-04-01T00:00:00.000Z"),
  dueDate: new Date("2026-04-10T00:00:00.000Z"),
  billingRecipient: null,
  billingEmail: null,
  billingAddress: null,
  billingVatId: null,
  notes: null,
  paymentTerms: null,
  subtotalMinor: 10000,
  taxMinor: 2000,
  totalMinor: 12000,
  amountPaidMinor: 0,
  sentAt: null,
  paidAt: null,
  voidedAt: null,
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  client: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Acme",
    billingRecipient: null,
    billingEmail: null,
    billingAddress: null,
    billingVatId: null,
  },
  lineItems: [
    {
      position: 1,
      description: "Design",
      quantity: new Prisma.Decimal("1"),
      unitPriceMinor: 10000,
      taxMode: "uk_vat",
      taxRateBps: 2000,
      lineSubtotalMinor: 10000,
      lineTaxMinor: 2000,
      lineTotalMinor: 12000,
    },
  ],
};

const baseLineItem = {
  id: "line-1",
  invoiceId: "inv-1",
  position: 1,
  description: "Design",
  quantity: new Prisma.Decimal("1"),
  unitPriceMinor: 10000,
  taxMode: "uk_vat",
  taxRateBps: 2000,
  lineSubtotalMinor: 10000,
  lineTaxMinor: 2000,
  lineTotalMinor: 12000,
  invoice: baseInvoice,
};

describe("invoice api controllers", () => {
  it("GET /api/invoices requires auth", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue({
      errorResponse: fail("req-noauth", "UNAUTHORIZED", "Authentication required", undefined, 401),
    });

    const res = await listInvoicesController(new Request("http://localhost/api/invoices"), deps as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("cross-workspace invoice detail returns NOT_FOUND", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(null);

    const res = await getInvoiceController(
      new Request("http://localhost/api/invoices/inv-x"),
      { id: "inv-x" },
      deps as any,
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("PATCH blocks status changes", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);

    const res = await patchInvoiceController(
      new Request("http://localhost/api/invoices/inv-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.ok).toBe(false);
    expect(json.error.requestId).toBe("req-1");
  });

  it("mark-sent rejects zero-total invoice", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue({
      ...baseInvoice,
      lineItems: [{ position: 1, lineSubtotalMinor: 0, lineTaxMinor: 0, lineTotalMinor: 0 }],
    });

    const res = await markSentController(
      new Request("http://localhost/api/invoices/inv-1", { method: "POST" }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("invalid input returns validation envelope", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);

    const res = await patchInvoiceController(
      new Request("http://localhost/api/invoices/inv-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dueDate: "bad-date" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("successful mutation writes ActivityLog", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);
    deps.db.invoice.update.mockResolvedValue({
      ...baseInvoice,
      dueDate: new Date("2026-04-15T00:00:00.000Z"),
    });

    const res = await patchInvoiceController(
      new Request("http://localhost/api/invoices/inv-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dueDate: "2026-04-15T00:00:00.000Z" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(200);
    expect(deps.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice.update" }));
  });

  it("PATCH blocks financial edits when invoice is not draft", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue({ ...baseInvoice, status: "sent" });

    const res = await patchInvoiceController(
      new Request("http://localhost/api/invoices/inv-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dueDate: "2026-04-15T00:00:00.000Z" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("line-item create requires auth", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue({
      errorResponse: fail("req-noauth", "UNAUTHORIZED", "Authentication required", undefined, 401),
    });

    const res = await createInvoiceLineItemController(
      new Request("http://localhost/api/invoices/inv-1/line-items", { method: "POST" }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(401);
  });

  it("line-item create blocks cross-workspace access with NOT_FOUND", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(null);

    const res = await createInvoiceLineItemController(
      new Request("http://localhost/api/invoices/inv-x/line-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "A", quantity: "1", unitPriceMinor: 100, taxMode: "none" }),
      }),
      { id: "inv-x" },
      deps as any,
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("line-item create/update/delete recalculates totals and writes activity", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue({ ...baseInvoice, status: "draft", lineItems: [] });
    deps.db.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn({
        invoiceLineItem: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ ...baseLineItem, id: "line-new", position: 1 }),
          findMany: vi.fn().mockResolvedValue([{ ...baseLineItem, id: "line-new", position: 1 }]),
          update: vi.fn().mockResolvedValue(baseLineItem),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        invoice: {
          update: vi.fn().mockResolvedValue(baseInvoice),
        },
      }),
    );
    deps.db.invoiceLineItem.findFirst.mockResolvedValue(baseLineItem);

    const createRes = await createInvoiceLineItemController(
      new Request("http://localhost/api/invoices/inv-1/line-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: "Design",
          quantity: "1",
          unitPriceMinor: 10000,
          taxMode: "uk_vat",
          taxRateBps: 2000,
        }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(createRes.status).toBe(200);

    const updateRes = await updateInvoiceLineItemController(
      new Request("http://localhost/api/invoice-line-items/line-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ unitPriceMinor: 12000 }),
      }),
      { id: "line-1" },
      deps as any,
    );
    expect(updateRes.status).toBe(200);

    const deleteRes = await deleteInvoiceLineItemController(
      new Request("http://localhost/api/invoice-line-items/line-1", { method: "DELETE" }),
      { id: "line-1" },
      deps as any,
    );
    expect(deleteRes.status).toBe(200);

    expect(deps.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice.line_item.create" }));
    expect(deps.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice.line_item.update" }));
    expect(deps.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice.line_item.delete" }));
  });

  it("line-item mutations reject non-draft invoice statuses", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue({ ...baseInvoice, status: "sent" });
    deps.db.invoiceLineItem.findFirst.mockResolvedValue({ ...baseLineItem, invoice: { ...baseInvoice, status: "paid" } });

    const createRes = await createInvoiceLineItemController(
      new Request("http://localhost/api/invoices/inv-1/line-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "A", quantity: "1", unitPriceMinor: 100, taxMode: "none" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(createRes.status).toBe(409);

    const updateRes = await updateInvoiceLineItemController(
      new Request("http://localhost/api/invoice-line-items/line-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Updated" }),
      }),
      { id: "line-1" },
      deps as any,
    );
    expect(updateRes.status).toBe(409);

    const deleteRes = await deleteInvoiceLineItemController(
      new Request("http://localhost/api/invoice-line-items/line-1", { method: "DELETE" }),
      { id: "line-1" },
      deps as any,
    );
    expect(deleteRes.status).toBe(409);
  });

  it("line-item validation errors are returned with standard envelope", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue({ ...baseInvoice, status: "draft", lineItems: [] });
    deps.db.invoiceLineItem.findFirst.mockResolvedValue({ ...baseLineItem, invoice: { ...baseInvoice, status: "draft" } });

    const createRes = await createInvoiceLineItemController(
      new Request("http://localhost/api/invoices/inv-1/line-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: "A",
          quantity: "-1",
          unitPriceMinor: -100,
          taxMode: "invalid",
        }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(createRes.status).toBe(400);
    const createJson = await createRes.json();
    expect(createJson.error.code).toBe("VALIDATION_ERROR");
  });

  it("pdf download requires auth", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue({
      errorResponse: fail("req-noauth", "UNAUTHORIZED", "Authentication required", undefined, 401),
    });

    const res = await downloadInvoicePdfController(
      new Request("http://localhost/api/invoices/inv-1/pdf"),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(401);
  });

  it("pdf download blocks cross-workspace probing with NOT_FOUND", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(null);

    const res = await downloadInvoicePdfController(
      new Request("http://localhost/api/invoices/inv-x/pdf"),
      { id: "inv-x" },
      deps as any,
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("pdf download returns application/pdf and writes activity", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);

    const res = await downloadInvoicePdfController(
      new Request("http://localhost/api/invoices/inv-1/pdf"),
      { id: "inv-1" },
      deps as any,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("MTX-2026-0001.pdf");
    expect(deps.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice.pdf.download" }));
  });

  it("pdf rendering uses trusted DB totals only", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue({
      ...baseInvoice,
      subtotalMinor: 10000,
      taxMinor: 2000,
      totalMinor: 12000,
    });

    await downloadInvoicePdfController(
      new Request("http://localhost/api/invoices/inv-1/pdf?totalMinor=1"),
      { id: "inv-1" },
      deps as any,
    );

    expect(deps.renderInvoicePdfBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotalMinor: 10000,
        taxMinor: 2000,
        totalMinor: 12000,
      }),
      expect.objectContaining({ legalName: "Test Workspace" }),
    );
  });

  it("send invoice email requires auth", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue({
      errorResponse: fail("req-noauth", "UNAUTHORIZED", "Authentication required", undefined, 401),
    });

    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k1" },
        body: JSON.stringify({ recipientEmail: "a@b.com" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(401);
  });

  it("send invoice email requires Idempotency-Key header", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientEmail: "a@b.com" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("send invoice email returns NOT_FOUND for other workspace", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(null);
    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-x/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k1" },
        body: JSON.stringify({ recipientEmail: "a@b.com" }),
      }),
      { id: "inv-x" },
      deps as any,
    );
    expect(res.status).toBe(404);
  });

  it("send invoice email blocks void invoice with CONFLICT", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue({ ...baseInvoice, status: "void" });
    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k1" },
        body: JSON.stringify({ recipientEmail: "a@b.com" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(409);
  });

  it("send invoice email returns CONFIG_ERROR and logs when Resend is not configured", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);
    deps.getResendInvoiceConfig.mockReturnValue(null);

    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k1" },
        body: JSON.stringify({ recipientEmail: "client@acme.com" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("CONFIG_ERROR");
    expect(deps.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice.email.send_failed" }));
    expect(deps.sendResendInvoiceEmail).not.toHaveBeenCalled();
  });

  it("send invoice email validates recipient", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);
    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k1" },
        body: JSON.stringify({ recipientEmail: "not-an-email" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("send invoice email returns idempotent replay without calling Resend", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    const recipient = "client@acme.com";
    const fp = computeInvoiceEmailRequestFingerprint("inv-1", recipient);
    deps.db.idempotencyRecord.findUnique.mockResolvedValue({
      requestFingerprint: fp,
      responseSnapshot: {
        v: 1,
        invoiceId: "inv-1",
        invoiceNumber: "MTX-2026-0001",
        status: "sent",
        sentAt: "2026-04-01T00:00:00.000Z",
        recipientEmail: recipient,
        resendMessageId: "re_old",
        idempotentReplay: false,
      },
    });
    const sentInvoice = { ...baseInvoice, status: "sent" as const, sentAt: new Date("2026-04-01T00:00:00.000Z") };
    deps.db.invoice.findFirst.mockResolvedValue(sentInvoice);

    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "same-key" },
        body: JSON.stringify({ recipientEmail: recipient }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.email.idempotentReplay).toBe(true);
    expect(json.data.email.resendMessageId).toBe("re_old");
    expect(deps.sendResendInvoiceEmail).not.toHaveBeenCalled();
  });

  it("send invoice email idempotency key conflicts for different request", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.idempotencyRecord.findUnique.mockResolvedValue({
      requestFingerprint: "different",
      responseSnapshot: { v: 1 },
    });
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);

    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k1" },
        body: JSON.stringify({ recipientEmail: "client@acme.com" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(409);
  });

  it("send invoice email successful draft transitions to sent and logs send", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);
    const afterSend = {
      ...baseInvoice,
      status: "sent" as const,
      sentAt: new Date("2026-04-10T00:00:00.000Z"),
    };
    deps.db.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        invoice: {
          update: vi
            .fn()
            .mockResolvedValue({ ...afterSend, lineItems: baseInvoice.lineItems, client: baseInvoice.client }),
          findFirst: vi.fn(),
        },
        idempotencyRecord: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k-new" },
        body: JSON.stringify({ recipientEmail: "client@acme.com" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.invoice.status).toBe("sent");
    expect(json.data.email.idempotentReplay).toBe(false);
    expect(deps.sendResendInvoiceEmail).toHaveBeenCalled();
    expect(deps.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "invoice.email.send", metadata: expect.objectContaining({ resendMessageId: "re_abc123" }) }),
    );
  });

  it("send invoice email allows resend when status is paid", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    const paid = {
      ...baseInvoice,
      status: "paid" as const,
      paidAt: new Date("2026-04-15T00:00:00.000Z"),
    };
    deps.db.invoice.findFirst.mockResolvedValue(paid);
    deps.db.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        invoice: {
          update: vi.fn(),
          findFirst: vi.fn().mockResolvedValue({ ...paid, lineItems: baseInvoice.lineItems, client: baseInvoice.client }),
        },
        idempotencyRecord: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k-paid" },
        body: JSON.stringify({ recipientEmail: "client@acme.com" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.invoice.status).toBe("paid");
    expect(deps.sendResendInvoiceEmail).toHaveBeenCalled();
  });

  it("send invoice email failure logs send_failed", async () => {
    const deps = makeDeps();
    deps.requireAuthApi.mockResolvedValue(baseAuth);
    deps.db.invoice.findFirst.mockResolvedValue(baseInvoice);
    deps.sendResendInvoiceEmail.mockResolvedValue({ error: "resend_rejected" });
    deps.db.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        invoice: { update: vi.fn(), findFirst: vi.fn() },
        idempotencyRecord: { create: vi.fn() },
      };
      return fn(tx);
    });

    const res = await sendInvoiceEmailController(
      new Request("http://localhost/api/invoices/inv-1/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "k1" },
        body: JSON.stringify({ recipientEmail: "client@acme.com" }),
      }),
      { id: "inv-1" },
      deps as any,
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(deps.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "invoice.email.send_failed", metadata: expect.objectContaining({ reason: "resend_error" }) }),
    );
    expect(deps.db.$transaction).not.toHaveBeenCalled();
  });
});
