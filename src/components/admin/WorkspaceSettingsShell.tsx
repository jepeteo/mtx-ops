"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { InvoiceIssuerV1 } from "@/lib/workspace/invoiceIssuer";
import type { IntegrationStatus, ResolvedWorkspaceSettingsV1 } from "@/lib/workspace/workspaceSettings";

type ApiOk<T> = { ok: true; data: T; requestId: string };
type ApiErr = { ok: false; error: { message: string } };

export type WorkspaceSettingsPayload = {
  name: string;
  settings: ResolvedWorkspaceSettingsV1;
  invoiceIssuer: InvoiceIssuerV1 | null;
  integrations: IntegrationStatus;
};

type WorkspaceSettingsContextValue = {
  loading: boolean;
  error: string | null;
  data: WorkspaceSettingsPayload | null;
  reload: () => Promise<void>;
  applyPayload: (payload: WorkspaceSettingsPayload) => void;
};

const WorkspaceSettingsContext = createContext<WorkspaceSettingsContextValue | null>(null);

export function useWorkspaceSettings() {
  const ctx = useContext(WorkspaceSettingsContext);
  if (!ctx) {
    throw new Error("useWorkspaceSettings must be used within WorkspaceSettingsShell");
  }
  return ctx;
}

export function WorkspaceSettingsShell({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WorkspaceSettingsPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/workspace/settings", { cache: "no-store" });
    const body = (await res.json().catch(() => null)) as ApiOk<WorkspaceSettingsPayload> | ApiErr | null;
    if (!res.ok || !body || !body.ok) {
      setError(body && !body.ok ? body.error.message : "Failed to load workspace settings");
      setData(null);
      setLoading(false);
      return;
    }
    setData(body.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPayload = useCallback((payload: WorkspaceSettingsPayload) => {
    setData(payload);
  }, []);

  return (
    <WorkspaceSettingsContext.Provider value={{ loading, error, data, reload: load, applyPayload }}>
      {children}
    </WorkspaceSettingsContext.Provider>
  );
}
