import React from "react";
import { Prisma } from "@prisma/client";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

type PdfLineItem = {
  position: number;
  description: string;
  quantity: string;
  unitPriceMinor: number;
  taxMode: "uk_vat" | "reverse_charge" | "none";
  taxRateBps: number;
  lineSubtotalMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  billingRecipient: string | null;
  billingEmail: string | null;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  notes: string | null;
  paymentTerms: string | null;
  lineItems: PdfLineItem[];
};

/** Map a DB invoice + line items to the PDF view model (trusted server-side data only). */
export function mapInvoiceToPdfData(invoice: {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  billingRecipient: string | null;
  billingEmail: string | null;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  notes: string | null;
  paymentTerms: string | null;
  lineItems: Array<{
    position: number;
    description: string;
    quantity: Prisma.Decimal;
    unitPriceMinor: number;
    taxMode: "uk_vat" | "reverse_charge" | "none";
    taxRateBps: number;
    lineSubtotalMinor: number;
    lineTaxMinor: number;
    lineTotalMinor: number;
  }>;
}): InvoicePdfData {
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    billingRecipient: invoice.billingRecipient,
    billingEmail: invoice.billingEmail,
    subtotalMinor: invoice.subtotalMinor,
    taxMinor: invoice.taxMinor,
    totalMinor: invoice.totalMinor,
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    lineItems: invoice.lineItems.map((line) => ({
      position: line.position,
      description: line.description,
      quantity: line.quantity.toString(),
      unitPriceMinor: line.unitPriceMinor,
      taxMode: line.taxMode,
      taxRateBps: line.taxRateBps,
      lineSubtotalMinor: line.lineSubtotalMinor,
      lineTaxMinor: line.lineTaxMinor,
      lineTotalMinor: line.lineTotalMinor,
    })),
  };
}

export function safeInvoiceAttachmentFilename(invoiceNumber: string) {
  return `${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
}

type PaymentInstructions = {
  accountName: string;
  iban: string;
  bic: string;
  bankName: string;
  referenceHint: string;
};

const DEFAULT_PAYMENT_INSTRUCTIONS: PaymentInstructions = {
  accountName: "MTX Studio (Revolut)",
  iban: "Configured in workspace settings (pending)",
  bic: "Configured in workspace settings (pending)",
  bankName: "Revolut",
  referenceHint: "Use invoice number as payment reference.",
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    marginBottom: 16,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1C2C4C",
  },
  subtitle: {
    marginTop: 2,
    color: "#4B5563",
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  muted: {
    color: "#6B7280",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    borderBottomStyle: "solid",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    borderBottomStyle: "solid",
    paddingVertical: 4,
  },
  colPos: { width: "6%" },
  colDesc: { width: "30%" },
  colQty: { width: "10%" },
  colUnit: { width: "13%", textAlign: "right" },
  colTaxMode: { width: "14%" },
  colTax: { width: "12%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  totalsBox: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalStrong: {
    fontWeight: 700,
  },
  notes: {
    marginTop: 6,
    lineHeight: 1.4,
  },
});

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatCurrency(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function taxModeLabel(mode: PdfLineItem["taxMode"]) {
  if (mode === "uk_vat") return "UK VAT";
  if (mode === "reverse_charge") return "Reverse charge";
  return "No tax";
}

function InvoicePdfDocument({
  data,
  paymentInstructions,
}: {
  data: InvoicePdfData;
  paymentInstructions: PaymentInstructions;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>MTX Studio</Text>
          <Text style={styles.subtitle}>Invoice</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice details</Text>
          <View style={styles.row}>
            <Text style={styles.muted}>Invoice number</Text>
            <Text>{data.invoiceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Issue date</Text>
            <Text>{formatDate(data.issueDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Due date</Text>
            <Text>{formatDate(data.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing</Text>
          <View style={styles.row}>
            <Text style={styles.muted}>Recipient</Text>
            <Text>{data.billingRecipient || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Email</Text>
            <Text>{data.billingEmail || "Not provided"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line items</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colPos}>#</Text>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit</Text>
            <Text style={styles.colTaxMode}>Tax mode</Text>
            <Text style={styles.colTax}>Tax</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {data.lineItems.map((line) => (
            <View style={styles.tableRow} key={`${line.position}-${line.description}`}>
              <Text style={styles.colPos}>{line.position}</Text>
              <Text style={styles.colDesc}>{line.description}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colUnit}>{formatCurrency(line.unitPriceMinor, data.currency)}</Text>
              <Text style={styles.colTaxMode}>
                {taxModeLabel(line.taxMode)}
                {line.taxMode === "uk_vat" ? ` (${(line.taxRateBps / 100).toFixed(2)}%)` : ""}
              </Text>
              <Text style={styles.colTax}>{formatCurrency(line.lineTaxMinor, data.currency)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(line.lineTotalMinor, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatCurrency(data.subtotalMinor, data.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Tax</Text>
            <Text>{formatCurrency(data.taxMinor, data.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalStrong}>Total</Text>
            <Text style={styles.totalStrong}>{formatCurrency(data.totalMinor, data.currency)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment instructions (Revolut)</Text>
          <Text>Account name: {paymentInstructions.accountName}</Text>
          <Text>IBAN: {paymentInstructions.iban}</Text>
          <Text>BIC: {paymentInstructions.bic}</Text>
          <Text>Bank: {paymentInstructions.bankName}</Text>
          <Text>{paymentInstructions.referenceHint}</Text>
        </View>

        {(data.notes || data.paymentTerms) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional notes</Text>
            {data.paymentTerms ? <Text style={styles.notes}>Payment terms: {data.paymentTerms}</Text> : null}
            {data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBuffer(data: InvoicePdfData) {
  return renderToBuffer(
    <InvoicePdfDocument data={data} paymentInstructions={DEFAULT_PAYMENT_INSTRUCTIONS} />,
  );
}
