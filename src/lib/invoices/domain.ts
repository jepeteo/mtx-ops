import { InvoiceStatus, InvoiceTaxMode, Prisma } from "@prisma/client";

export type ComputedInvoiceStatus = InvoiceStatus | "overdue";

export type InvoiceLineInput = {
  quantity: Prisma.Decimal;
  unitPriceMinor: number;
  taxMode: InvoiceTaxMode;
  taxRateBps?: number;
};

export type InvoiceLineTotals = {
  lineSubtotalMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
};

export type InvoiceTotals = {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export type InvoiceTotalsOptions = {
  requirePositiveTotal?: boolean;
};

const BASIS_POINTS_DIVISOR = 10_000;

function assertMinorUnits(value: number, fieldName: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer in minor units.`);
  }
}

function assertDecimalQuantity(value: Prisma.Decimal) {
  if (!(value instanceof Prisma.Decimal)) {
    throw new Error("quantity must be a Prisma.Decimal value.");
  }
  if (value.lte(0)) {
    throw new Error("quantity must be greater than zero.");
  }
}

function assertNonNegativeInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
}

export function computeTaxMinor(subtotalMinor: number, taxMode: InvoiceTaxMode, taxRateBps = 0) {
  assertMinorUnits(subtotalMinor, "subtotalMinor");
  assertNonNegativeInteger(taxRateBps, "taxRateBps");

  if (taxMode === InvoiceTaxMode.reverse_charge || taxMode === InvoiceTaxMode.none) {
    return 0;
  }

  if (taxMode !== InvoiceTaxMode.uk_vat) {
    throw new Error("Unsupported tax mode.");
  }

  return Math.round((subtotalMinor * taxRateBps) / BASIS_POINTS_DIVISOR);
}

export function calculateLineTotals(input: InvoiceLineInput): InvoiceLineTotals {
  assertDecimalQuantity(input.quantity);
  assertNonNegativeInteger(input.unitPriceMinor, "unitPriceMinor");

  const lineSubtotalMinorDecimal = input.quantity
    .mul(input.unitPriceMinor)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  const lineSubtotalMinor = Number.parseInt(lineSubtotalMinorDecimal.toFixed(0), 10);
  const lineTaxMinor = computeTaxMinor(lineSubtotalMinor, input.taxMode, input.taxRateBps ?? 0);
  const lineTotalMinor = lineSubtotalMinor + lineTaxMinor;

  return { lineSubtotalMinor, lineTaxMinor, lineTotalMinor };
}

export function calculateInvoiceTotals(lines: InvoiceLineTotals[], options: InvoiceTotalsOptions = {}): InvoiceTotals {
  const totals = lines.reduce(
    (acc, line) => {
      assertMinorUnits(line.lineSubtotalMinor, "lineSubtotalMinor");
      assertMinorUnits(line.lineTaxMinor, "lineTaxMinor");
      assertMinorUnits(line.lineTotalMinor, "lineTotalMinor");

      return {
        subtotalMinor: acc.subtotalMinor + line.lineSubtotalMinor,
        taxMinor: acc.taxMinor + line.lineTaxMinor,
        totalMinor: acc.totalMinor + line.lineTotalMinor,
      };
    },
    { subtotalMinor: 0, taxMinor: 0, totalMinor: 0 },
  );

  if (options.requirePositiveTotal && totals.totalMinor <= 0) {
    throw new Error("Zero-total invoices are not allowed in V1.");
  }

  return totals;
}

export function computeInvoiceStatus(status: InvoiceStatus, dueDate: Date, now = new Date()): ComputedInvoiceStatus {
  if (status === InvoiceStatus.sent && dueDate.getTime() < now.getTime()) {
    return "overdue";
  }

  return status;
}

export function formatInvoiceNumber(issueDate: Date, sequence: number) {
  assertNonNegativeInteger(sequence, "sequence");

  if (sequence <= 0) {
    throw new Error("sequence must be greater than zero.");
  }

  const year = issueDate.getUTCFullYear();
  const paddedSequence = sequence.toString().padStart(4, "0");
  return `MTX-${year}-${paddedSequence}`;
}

export function canTransitionInvoiceStatus(from: InvoiceStatus, to: InvoiceStatus) {
  if (from === to) {
    return true;
  }

  if (from === InvoiceStatus.draft && (to === InvoiceStatus.sent || to === InvoiceStatus.void)) {
    return true;
  }

  if (from === InvoiceStatus.sent && (to === InvoiceStatus.paid || to === InvoiceStatus.void)) {
    return true;
  }

  return false;
}
