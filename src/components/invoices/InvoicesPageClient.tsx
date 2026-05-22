"use client";

import { useState } from "react";
import { CreateInvoiceDraftForm } from "./CreateInvoiceDraftForm";
import { InvoicesListView } from "./InvoicesListView";
import type { ApiEnvelope, InvoiceRecord } from "./types";

type ClientOption = { id: string; name: string };

export function InvoicesPageClient({ initialClients }: { initialClients: ClientOption[] }) {
  const [clients] = useState<ClientOption[]>(initialClients);
  const [error] = useState<string | null>(null);
  const [, setLastCreated] = useState<InvoiceRecord | null>(null);

  return (
    <div className="space-y-4">
      <CreateInvoiceDraftForm clients={clients} onCreated={(invoice) => setLastCreated(invoice)} />
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
      <InvoicesListView />
    </div>
  );
}
