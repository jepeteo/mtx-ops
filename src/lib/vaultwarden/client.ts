import { env } from "@/lib/env";

export type VaultRevealRequest = {
  vaultItemId: string;
  fieldName: string;
};

/**
 * V1 NOTE:
 * Vaultwarden exposes a Bitwarden-compatible API, but deployments vary
 * (some require OAuth/client credentials, some require user token flows).
 *
 * This scaffold keeps the integration behind an interface so we can implement
 * the correct auth flow for your Vaultwarden setup in Phase 6.
 */
export async function revealSecret(_req: VaultRevealRequest): Promise<{ value: string }> {
  if (!env.VAULTWARDEN_URL) {
    throw new Error("VAULTWARDEN_URL is not configured");
  }
  // TODO(phase-6): Implement Bitwarden API authentication + item retrieval.
  // For now, throw a clear error so UI can display "Vault unavailable / not configured".
  throw new Error("Vaultwarden integration not implemented yet (Phase 6).");
}
