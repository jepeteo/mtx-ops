"use client";

import { Badge } from "@/components/ui/badge";
import { invoiceStatusTone, type UiInvoiceStatus } from "@/lib/invoices/ui";

export function InvoiceStatusBadge({ status }: { status: UiInvoiceStatus }) {
  return (
    <Badge className={`border-0 capitalize ${invoiceStatusTone(status)}`}>
      {status}
    </Badge>
  );
}
