"use client";

import { useEffect, useState } from "react";
import { CreateInvoiceDraftForm } from "./CreateInvoiceDraftForm";
import { InvoicesListView } from "./InvoicesListView";
import type { ApiEnvelope, InvoiceRecord } from "./types";

type ClientOption = { id: string; name: string };

export function InvoicesPageClient() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setLastCreated] = useState<InvoiceRecord | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadClients() {
      const response = await fetch("/api/clients", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | ApiEnvelope<{ clients: ClientOption[] }>
        | null;
      if (!mounted) return;
      if (!response.ok || !payload || !payload.ok) {
        setError(payload && !payload.ok ? payload.error.message : "Failed to load clients");
        setClients([]);
        return;
      }
      setClients(payload.data.clients);
    }
    loadClients();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <CreateInvoiceDraftForm clients={clients} onCreated={(invoice) => setLastCreated(invoice)} />
      {error ? <div className="text-xs font-medium text-destructive">{error}</div> : null}
      <InvoicesListView />
    </div>
  );
}
