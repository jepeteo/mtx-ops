"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ConfirmInvoiceActionDialog({
  triggerLabel,
  title,
  message,
  confirmLabel,
  confirmVariant = "default",
  disabled,
  onConfirm,
}: {
  triggerLabel: string;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  disabled?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runConfirm() {
    setSaving(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            <div>
              <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
              <DialogDescription className="mt-1">{message}</DialogDescription>
            </div>
            {error ? <div role="alert" className="text-xs font-medium text-destructive">{error}</div> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant={confirmVariant} size="sm" onClick={runConfirm} disabled={saving}>
                {saving ? "Working..." : confirmLabel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
