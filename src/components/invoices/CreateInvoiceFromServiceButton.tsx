"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateInvoiceDraftForm } from "./CreateInvoiceDraftForm";
import type { InvoiceLinePreset } from "./CreateInvoiceDraftForm";

export function CreateInvoiceFromServiceButton({
  clientId,
  clientName,
  serviceId,
  serviceName,
  serviceProvider,
}: {
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  serviceProvider: string;
}) {
  const [open, setOpen] = useState(false);
  const initialLineItems: InvoiceLinePreset[] = [
    {
      description: `${serviceName} (${serviceProvider})`,
      quantity: "1",
      unitPriceMinor: 0,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-7 px-2.5 text-xs">
          Create invoice draft
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle className="mb-3">Invoice draft from renewal</DialogTitle>
        <CreateInvoiceDraftForm
          clients={[{ id: clientId, name: clientName }]}
          fixedClientId={clientId}
          sourceServiceId={serviceId}
          initialLineItems={initialLineItems}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
