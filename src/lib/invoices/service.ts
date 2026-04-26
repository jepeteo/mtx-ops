import { InvoiceStatus, InvoiceTaxMode, Prisma } from "@prisma/client";
import { z } from "zod";
import {
  calculateInvoiceTotals,
  calculateLineTotals,
  canTransitionInvoiceStatus,
  computeInvoiceStatus,
  formatInvoiceNumber,
  type InvoiceLineTotals,
} from "@/lib/invoices/domain";

export const PersistedInvoiceStatusSchema = z.enum(["draft", "sent", "paid", "void"]);
export const InvoiceStatusFilterSchema = z.enum(["draft", "sent", "paid", "void", "overdue"]);

const DecimalQuantitySchema = z
  .union([z.string(), z.number()])
  .transform((value) => new Prisma.Decimal(value))
  .refine((value) => value.gt(0), { message: "Quantity must be greater than zero" });

export const InvoiceLineInputSchema = z.object({
  description: z.string().min(1).max(400),
  quantity: DecimalQuantitySchema,
  unitPriceMinor: z.number().int().nonnegative(),
  taxMode: z.enum(["uk_vat", "reverse_charge", "none"]),
  taxRateBps: z.number().int().nonnegative().max(100_000).optional(),
});

export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  currency: z.string().min(3).max(3),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  billingRecipient: z.string().max(200).optional().nullable(),
  billingEmail: z.string().email().max(255).optional().nullable(),
  notes: z.string().max(4_000).optional().nullable(),
  paymentTerms: z.string().max(400).optional().nullable(),
  lineItems: z.array(InvoiceLineInputSchema).max(500).optional().default([]),
});

export const UpdateInvoiceSchema = z
  .object({
    currency: z.string().min(3).max(3).optional(),
    issueDate: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    billingRecipient: z.string().max(200).optional().nullable(),
    billingEmail: z.string().email().max(255).optional().nullable(),
    notes: z.string().max(4_000).optional().nullable(),
    paymentTerms: z.string().max(400).optional().nullable(),
    status: z.never().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const MarkSentSchema = z.object({
  sentAt: z.string().datetime().optional(),
});

export const MarkPaidSchema = z.object({
  paidAt: z.string().datetime().optional(),
  amountPaidMinor: z.number().int().positive().optional(),
});

export const MarkVoidSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const SendInvoiceEmailBodySchema = z.object({
  recipientEmail: z.string().email(),
});

/** Idempotency route key for POST /api/invoices/[id]/send-email */
export const INVOICE_SEND_EMAIL_ROUTE_KEY = "invoice:send-email";

export function computeStoredLineTotals(line: z.infer<typeof InvoiceLineInputSchema>) {
  return calculateLineTotals({
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    taxMode: line.taxMode as InvoiceTaxMode,
    taxRateBps: line.taxRateBps,
  });
}

export function buildInvoiceTotals(lineTotals: InvoiceLineTotals[], requirePositiveTotal = false) {
  return calculateInvoiceTotals(lineTotals, { requirePositiveTotal });
}

export function toApiInvoice(invoice: {
  id: string;
  workspaceId: string;
  clientId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  billingRecipient: string | null;
  billingEmail: string | null;
  notes: string | null;
  paymentTerms: string | null;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  sentAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...invoice,
    computedStatus: computeInvoiceStatus(invoice.status, invoice.dueDate),
  };
}

export async function reserveInvoiceNumber(params: {
  tx: Prisma.TransactionClient;
  workspaceId: string;
  issueDate: Date;
}) {
  const year = params.issueDate.getUTCFullYear();
  const sequenceRow = await params.tx.invoiceSequence.upsert({
    where: {
      workspaceId_year: {
        workspaceId: params.workspaceId,
        year,
      },
    },
    create: {
      workspaceId: params.workspaceId,
      year,
      nextSequence: 2,
    },
    update: {
      nextSequence: {
        increment: 1,
      },
    },
    select: {
      nextSequence: true,
    },
  });

  const sequence = sequenceRow.nextSequence - 1;
  return formatInvoiceNumber(params.issueDate, sequence);
}

export function assertTransition(from: InvoiceStatus, to: InvoiceStatus) {
  if (!canTransitionInvoiceStatus(from, to)) {
    throw new Error(`Invalid invoice status transition: ${from} -> ${to}`);
  }
}
