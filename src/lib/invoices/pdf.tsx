import "server-only";
import React from "react";
import { Prisma } from "@prisma/client";
import { Document, Page, Text, View, StyleSheet, Image as PdfImage, renderToBuffer } from "@react-pdf/renderer";
import type { InvoiceIssuerPdfContext } from "@/lib/workspace/invoiceIssuer";

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
  billingAddress: string | null;
  billingVatId: string | null;
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
  billingAddress: string | null;
  billingVatId: string | null;
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
    billingAddress: invoice.billingAddress,
    billingVatId: invoice.billingVatId,
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

const palette = {
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  accent: "#1e3a5f",
  accentSoft: "#f1f5f9",
  zebra: "#f8fafc",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: palette.ink,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: palette.accent,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingLeft: 8,
  },
  issuerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: "58%",
  },
  logo: {
    width: 72,
    height: 72,
    objectFit: "contain",
    marginRight: 14,
  },
  issuerTextBlock: {
    maxWidth: 280,
  },
  issuerName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: palette.accent,
    marginBottom: 4,
  },
  issuerLine: {
    fontSize: 8.5,
    color: palette.muted,
    marginBottom: 2,
    lineHeight: 1.35,
  },
  headerRight: {
    alignItems: "flex-end",
    maxWidth: "38%",
  },
  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: palette.ink,
    letterSpacing: 0.5,
  },
  docMeta: {
    marginTop: 8,
    fontSize: 9,
    color: palette.muted,
    textAlign: "right",
  },
  docMetaStrong: {
    fontFamily: "Helvetica-Bold",
    color: palette.ink,
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    gap: 24,
  },
  billToBox: {
    flex: 1,
    backgroundColor: palette.accentSoft,
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  boxTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: palette.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  billLine: {
    fontSize: 9.5,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  billMuted: {
    fontSize: 8,
    color: palette.muted,
    marginTop: 4,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: palette.accent,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowAlt: {
    backgroundColor: palette.zebra,
  },
  colPos: { width: "5%" },
  colDesc: { width: "34%" },
  colQty: { width: "9%" },
  colUnit: { width: "12%", textAlign: "right" },
  colTaxMode: { width: "16%" },
  colTax: { width: "12%", textAlign: "right" },
  colTotal: { width: "12%", textAlign: "right" },
  totalsCard: {
    marginTop: 14,
    alignSelf: "flex-end",
    width: 200,
    backgroundColor: palette.accentSoft,
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalMuted: { fontSize: 9, color: palette.muted },
  totalStrong: { fontSize: 11, fontFamily: "Helvetica-Bold", color: palette.ink },
  paymentBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#ffffff",
  },
  paymentTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: palette.accent,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    fontSize: 8.5,
  },
  paymentLabel: { color: palette.muted, width: "32%" },
  paymentVal: { width: "65%", textAlign: "right" },
  notesSection: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: palette.ink,
  },
  notes: {
    fontSize: 8.5,
    color: palette.muted,
    lineHeight: 1.45,
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

async function loadLogoDataUrl(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    if (!mimeType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 4_000_000) return null;
    return `data:${mimeType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function InvoicePdfDocument({
  data,
  issuer,
  logoDataUrl,
}: {
  data: InvoicePdfData;
  issuer: InvoiceIssuerPdfContext;
  logoDataUrl: string | null;
}) {
  const pay = issuer.payment;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        <View style={styles.headerRow}>
          <View style={styles.issuerLeft}>
            {logoDataUrl ? <PdfImage src={logoDataUrl} style={styles.logo} /> : null}
            <View style={styles.issuerTextBlock}>
              <Text style={styles.issuerName}>{issuer.legalName}</Text>
              {issuer.addressLines.map((line, i) => (
                <Text key={`addr-${i}`} style={styles.issuerLine}>
                  {line}
                </Text>
              ))}
              {issuer.vatId ? <Text style={styles.issuerLine}>VAT: {issuer.vatId}</Text> : null}
              {issuer.email ? <Text style={styles.issuerLine}>{issuer.email}</Text> : null}
              {issuer.phone ? <Text style={styles.issuerLine}>{issuer.phone}</Text> : null}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Invoice</Text>
            <Text style={styles.docMeta}>
              <Text style={styles.docMetaStrong}>{data.invoiceNumber}</Text>
            </Text>
            <Text style={styles.docMeta}>Issued {formatDate(data.issueDate)}</Text>
            <Text style={styles.docMeta}>Due {formatDate(data.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.billToBox}>
            <Text style={styles.boxTitle}>Bill to</Text>
            <Text style={styles.billLine}>{data.billingRecipient || "Not provided"}</Text>
            {data.billingEmail ? (
              <Text style={styles.billLine}>{data.billingEmail}</Text>
            ) : (
              <Text style={styles.billMuted}>No billing email</Text>
            )}
            {data.billingAddress ? (
              <Text style={styles.billLine}>{data.billingAddress}</Text>
            ) : null}
            {data.billingVatId ? <Text style={styles.billMuted}>Client VAT: {data.billingVatId}</Text> : null}
          </View>
        </View>

        <View style={styles.tableWrap}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colPos]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colUnit]}>Unit</Text>
            <Text style={[styles.th, styles.colTaxMode]}>Tax</Text>
            <Text style={[styles.th, styles.colTax]}>Tax amt</Text>
            <Text style={[styles.th, styles.colTotal]}>Line</Text>
          </View>
          {data.lineItems.map((line, idx) => (
            <View
              wrap={false}
              key={`${line.position}-${line.description}`}
              style={[styles.tableRow, idx % 2 === 1 ? styles.rowAlt : {}]}
            >
              <Text style={styles.colPos}>{line.position}</Text>
              <Text style={styles.colDesc}>{line.description}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colUnit}>{formatCurrency(line.unitPriceMinor, data.currency)}</Text>
              <Text style={styles.colTaxMode}>
                {taxModeLabel(line.taxMode)}
                {line.taxMode === "uk_vat" ? ` ${(line.taxRateBps / 100).toFixed(0)}%` : ""}
              </Text>
              <Text style={styles.colTax}>{formatCurrency(line.lineTaxMinor, data.currency)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(line.lineTotalMinor, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalMuted}>Subtotal</Text>
            <Text style={styles.totalMuted}>{formatCurrency(data.subtotalMinor, data.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalMuted}>Tax</Text>
            <Text style={styles.totalMuted}>{formatCurrency(data.taxMinor, data.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalStrong}>Total due</Text>
            <Text style={styles.totalStrong}>{formatCurrency(data.totalMinor, data.currency)}</Text>
          </View>
        </View>

        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Payment details</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Account name</Text>
            <Text style={styles.paymentVal}>{pay.accountName}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>IBAN</Text>
            <Text style={styles.paymentVal}>{pay.iban}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>BIC / SWIFT</Text>
            <Text style={styles.paymentVal}>{pay.bic}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Bank</Text>
            <Text style={styles.paymentVal}>{pay.bankName}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Reference</Text>
            <Text style={styles.paymentVal}>{pay.referenceHint}</Text>
          </View>
          {pay.notes ? (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.notes}>{pay.notes}</Text>
            </View>
          ) : null}
        </View>

        {(data.notes || data.paymentTerms) && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {data.paymentTerms ? <Text style={styles.notes}>Payment terms: {data.paymentTerms}</Text> : null}
            {data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBuffer(data: InvoicePdfData, issuer: InvoiceIssuerPdfContext) {
  const logoDataUrl = await loadLogoDataUrl(issuer.logoUrl);
  return renderToBuffer(<InvoicePdfDocument data={data} issuer={issuer} logoDataUrl={logoDataUrl} />);
}
