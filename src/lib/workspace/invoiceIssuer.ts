import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const InvoiceIssuerPaymentSchema = z.object({
  accountName: z.string().max(200).optional().nullable(),
  iban: z.string().max(64).optional().nullable(),
  bic: z.string().max(32).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
  referenceHint: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const InvoiceIssuerV1Schema = z.object({
  v: z.literal(1),
  legalName: z.string().max(200).optional().nullable(),
  addressLines: z.array(z.string().max(500)).max(20).optional(),
  vatId: z.string().max(80).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(80).optional().nullable(),
  logoUrl: z.string().url().max(2000).optional().nullable(),
  payment: InvoiceIssuerPaymentSchema.optional().nullable(),
});

export type InvoiceIssuerV1 = z.infer<typeof InvoiceIssuerV1Schema>;

/** Partial update: any provided key replaces that slice in stored v1 object. */
export const PatchInvoiceIssuerSchema = z
  .object({
    legalName: z.string().max(200).optional().nullable(),
    addressLines: z.array(z.string().max(500)).max(20).optional(),
    vatId: z.string().max(80).optional().nullable(),
    email: z.union([z.string().email().max(255), z.literal(""), z.null()]).optional(),
    phone: z.string().max(80).optional().nullable(),
    logoUrl: z.union([z.string().url().max(2000), z.literal(""), z.null()]).optional(),
    payment: InvoiceIssuerPaymentSchema.optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export type PatchInvoiceIssuer = z.infer<typeof PatchInvoiceIssuerSchema>;

export function parseInvoiceIssuerJson(raw: Prisma.JsonValue | null | undefined): InvoiceIssuerV1 | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const parsed = InvoiceIssuerV1Schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function mergePayment(
  base: InvoiceIssuerV1["payment"],
  patch: NonNullable<Exclude<PatchInvoiceIssuer["payment"], null | undefined>>,
): NonNullable<InvoiceIssuerV1["payment"]> {
  return {
    accountName: patch.accountName !== undefined ? patch.accountName : base?.accountName ?? null,
    iban: patch.iban !== undefined ? patch.iban : base?.iban ?? null,
    bic: patch.bic !== undefined ? patch.bic : base?.bic ?? null,
    bankName: patch.bankName !== undefined ? patch.bankName : base?.bankName ?? null,
    referenceHint: patch.referenceHint !== undefined ? patch.referenceHint : base?.referenceHint ?? null,
    notes: patch.notes !== undefined ? patch.notes : base?.notes ?? null,
  };
}

function normalizeEmail(v: PatchInvoiceIssuer["email"]) {
  if (v === undefined) return undefined;
  if (v === "" || v === null) return null;
  return v;
}

function normalizeLogo(v: PatchInvoiceIssuer["logoUrl"]) {
  if (v === undefined) return undefined;
  if (v === "" || v === null) return null;
  return v;
}

export function mergeInvoiceIssuer(existing: InvoiceIssuerV1 | null, patch: PatchInvoiceIssuer): InvoiceIssuerV1 {
  const base: InvoiceIssuerV1 = existing ?? { v: 1 };
  const email = patch.email !== undefined ? normalizeEmail(patch.email) : base.email;
  const logoUrl = patch.logoUrl !== undefined ? normalizeLogo(patch.logoUrl) : base.logoUrl;
  return {
    v: 1,
    legalName: patch.legalName !== undefined ? patch.legalName : base.legalName,
    addressLines: patch.addressLines !== undefined ? patch.addressLines : base.addressLines,
    vatId: patch.vatId !== undefined ? patch.vatId : base.vatId,
    email: email === undefined ? base.email : email,
    phone: patch.phone !== undefined ? patch.phone : base.phone,
    logoUrl: logoUrl === undefined ? base.logoUrl : logoUrl,
    payment:
      patch.payment === undefined ? base.payment : patch.payment === null ? null : mergePayment(base.payment, patch.payment),
  };
}

export type InvoiceIssuerPdfContext = {
  legalName: string;
  addressLines: string[];
  vatId: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  payment: {
    accountName: string;
    iban: string;
    bic: string;
    bankName: string;
    referenceHint: string;
    notes: string | null;
  };
};

export function invoiceIssuerToPdfContext(workspaceName: string, raw: Prisma.JsonValue | null | undefined): InvoiceIssuerPdfContext {
  const parsed = parseInvoiceIssuerJson(raw);
  const payment = parsed?.payment;
  return {
    legalName: (parsed?.legalName && parsed.legalName.trim()) || workspaceName,
    addressLines: parsed?.addressLines?.filter((l) => l.trim()) ?? [],
    vatId: parsed?.vatId?.trim() || null,
    email: parsed?.email?.trim() || null,
    phone: parsed?.phone?.trim() || null,
    logoUrl: parsed?.logoUrl?.trim() || null,
    payment: {
      accountName: (payment?.accountName && payment.accountName.trim()) || "—",
      iban: (payment?.iban && payment.iban.trim()) || "—",
      bic: (payment?.bic && payment.bic.trim()) || "—",
      bankName: (payment?.bankName && payment.bankName.trim()) || "—",
      referenceHint: (payment?.referenceHint && payment.referenceHint.trim()) || "Use the invoice number as the payment reference.",
      notes: payment?.notes?.trim() || null,
    },
  };
}
