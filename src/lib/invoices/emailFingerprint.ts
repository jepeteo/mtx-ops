import { createHash } from "node:crypto";

export function computeInvoiceEmailRequestFingerprint(invoiceId: string, recipientEmail: string) {
  const normalized = recipientEmail.trim().toLowerCase();
  return createHash("sha256").update(`${invoiceId}\n${normalized}`).digest("hex");
}
