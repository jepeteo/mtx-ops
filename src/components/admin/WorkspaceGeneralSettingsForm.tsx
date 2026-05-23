"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormFieldInput } from "@/components/ui/form-field";
import { useWorkspaceSettings } from "./WorkspaceSettingsShell";

type ApiOk<T> = { ok: true; data: T; requestId: string };
type ApiErr = { ok: false; error: { message: string } };

export function WorkspaceGeneralSettingsForm() {
  const router = useRouter();
  const { loading, error, data, applyPayload } = useWorkspaceSettings();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [renewalDays, setRenewalDays] = useState("");
  const [inactivityThreshold, setInactivityThreshold] = useState("");
  const [inactivityInterval, setInactivityInterval] = useState("");

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setRenewalDays(data.settings.general.defaultRenewalReminderDays.join(","));
    setInactivityThreshold(String(data.settings.general.inactivityThresholdDays));
    setInactivityInterval(String(data.settings.general.inactivityReminderIntervalDays));
  }, [data]);

  async function save() {
    if (!data) return;

    const parsedRenewal = renewalDays
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v >= 0 && v <= 365);

    if (parsedRenewal.length === 0) {
      toast.error("Enter at least one renewal reminder day (0–365).");
      return;
    }

    const threshold = Number(inactivityThreshold);
    const interval = Number(inactivityInterval);
    if (!Number.isInteger(threshold) || threshold < 7 || threshold > 365) {
      toast.error("Inactivity threshold must be an integer between 7 and 365.");
      return;
    }
    if (!Number.isInteger(interval) || interval < 1 || interval > 90) {
      toast.error("Inactivity reminder interval must be an integer between 1 and 90.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Workspace name is required.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/workspace/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: trimmedName,
        settings: {
          general: {
            defaultRenewalReminderDays: parsedRenewal,
            inactivityThresholdDays: threshold,
            inactivityReminderIntervalDays: interval,
          },
        },
      }),
    });
    const body = (await res.json().catch(() => null)) as ApiOk<typeof data> | ApiErr | null;
    setSaving(false);

    if (!res.ok || !body || !body.ok) {
      toast.error(body && !body.ok ? body.error.message : "Save failed");
      return;
    }

    applyPayload(body.data);
    toast.success("General settings saved.");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  if (error) {
    return <p className="text-sm font-medium text-destructive">{error}</p>;
  }

  return (
    <div className="grid max-w-2xl gap-6">
      <p className="text-sm text-muted-foreground">
        Renewal and inactivity values are read from the database when the notification cron runs (every 6 hours).
      </p>

      <FormFieldInput id="workspace-name" label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} />
      <FormFieldInput
        id="renewal-days"
        label="Default renewal reminder days"
        value={renewalDays}
        onChange={(e) => setRenewalDays(e.target.value)}
        placeholder="60,30,14,7"
      />
      <p className="-mt-4 text-xs text-muted-foreground">Comma-separated days before renewal (sorted descending, unique integers 0–365).</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormFieldInput
          id="inactivity-threshold"
          label="Inactivity threshold (days)"
          type="number"
          min={7}
          max={365}
          value={inactivityThreshold}
          onChange={(e) => setInactivityThreshold(e.target.value)}
        />
        <FormFieldInput
          id="inactivity-interval"
          label="Inactivity reminder interval (days)"
          type="number"
          min={1}
          max={90}
          value={inactivityInterval}
          onChange={(e) => setInactivityInterval(e.target.value)}
        />
      </div>

      <div>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save general settings"}
        </Button>
      </div>
    </div>
  );
}
