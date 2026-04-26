export function formatMinorCurrency(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export type UiInvoiceStatus = "draft" | "sent" | "paid" | "void" | "overdue";

export function invoiceStatusTone(status: UiInvoiceStatus) {
  if (status === "paid") return "bg-emerald-500/15 text-emerald-400";
  if (status === "overdue") return "bg-destructive/15 text-destructive";
  if (status === "sent") return "bg-warning/15 text-warning";
  if (status === "void") return "bg-secondary text-muted-foreground";
  return "bg-info/15 text-info";
}
