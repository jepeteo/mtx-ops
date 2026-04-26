export function formatMinorCurrency(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

/** Major units (e.g. 10.50) → integer minor units; matches {@link formatMinorCurrency} (100 minor per major). */
export function parseMajorCurrencyToMinor(value: string): number {
  const normalized = value.trim().replace(/,/g, "");
  if (normalized === "") return 0;
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/** User percent (e.g. 20 for 20%) → basis points (2000). */
export function parsePercentToBps(value: string): number {
  const n = Number.parseFloat(value.trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100_000, Math.round(n * 100));
}

export function formatBpsAsPercent(bps: number): string {
  if (bps <= 0) return "—";
  const pct = bps / 100;
  const rounded = Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2).replace(/\.?0+$/, "");
  return `${rounded}%`;
}

export type UiInvoiceStatus = "draft" | "sent" | "paid" | "void" | "overdue";

export function invoiceStatusTone(status: UiInvoiceStatus) {
  if (status === "paid") return "bg-emerald-500/15 text-emerald-400";
  if (status === "overdue") return "bg-destructive/15 text-destructive";
  if (status === "sent") return "bg-warning/15 text-warning";
  if (status === "void") return "bg-secondary text-muted-foreground";
  return "bg-info/15 text-info";
}
