import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { env } from "@/lib/env";

export const DEFAULT_RENEWAL_REMINDER_DAYS = [60, 30, 14, 7] as const;
export const DEFAULT_TASK_DUE_REMINDER_DAYS = [7, 3, 1, 0] as const;
export const DEFAULT_INACTIVITY_THRESHOLD_DAYS = 30;
export const DEFAULT_INACTIVITY_REMINDER_INTERVAL_DAYS = 7;
export const DEFAULT_INVOICE_CURRENCY = "GBP";
export const DEFAULT_INVOICE_TAX_MODE = "none" as const;

const reminderDaySchema = z.number().int().min(0).max(365);

const WorkspaceSettingsGeneralSchema = z.object({
  defaultRenewalReminderDays: z.array(reminderDaySchema).min(1).max(20).optional(),
  defaultTaskDueReminderDays: z.array(reminderDaySchema).min(1).max(20).optional(),
  inactivityThresholdDays: z.number().int().min(7).max(365).optional(),
  inactivityReminderIntervalDays: z.number().int().min(1).max(90).optional(),
});

const WorkspaceSettingsInvoicingSchema = z.object({
  defaultCurrency: z
    .string()
    .length(3)
    .regex(/^[A-Za-z]{3}$/)
    .transform((v) => v.toUpperCase())
    .optional(),
  defaultPaymentTerms: z.string().max(400).optional().nullable(),
  defaultTaxMode: z.enum(["uk_vat", "reverse_charge", "none"]).optional(),
});

export const WorkspaceSettingsV1Schema = z.object({
  v: z.literal(1),
  general: WorkspaceSettingsGeneralSchema.optional(),
  invoicing: WorkspaceSettingsInvoicingSchema.optional(),
});

export type WorkspaceSettingsV1 = z.infer<typeof WorkspaceSettingsV1Schema>;

export type ResolvedWorkspaceSettingsV1 = {
  v: 1;
  general: {
    defaultRenewalReminderDays: number[];
    defaultTaskDueReminderDays: number[];
    inactivityThresholdDays: number;
    inactivityReminderIntervalDays: number;
  };
  invoicing: {
    defaultCurrency: string;
    defaultPaymentTerms: string | null;
    defaultTaxMode: "uk_vat" | "reverse_charge" | "none";
  };
};

const PatchWorkspaceSettingsGeneralSchema = WorkspaceSettingsGeneralSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one general field is required" },
);

const PatchWorkspaceSettingsInvoicingSchema = WorkspaceSettingsInvoicingSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one invoicing field is required" },
);

export const PatchWorkspaceSettingsSchema = z
  .object({
    general: PatchWorkspaceSettingsGeneralSchema.optional(),
    invoicing: PatchWorkspaceSettingsInvoicingSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one section is required" });

export type PatchWorkspaceSettings = z.infer<typeof PatchWorkspaceSettingsSchema>;

export const PatchWorkspaceSettingsBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    settings: PatchWorkspaceSettingsSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.settings !== undefined, {
    message: "At least one field is required",
  });

export type IntegrationStatus = {
  database: boolean;
  storage: boolean;
  vault: boolean;
  email: boolean;
  upstash: boolean;
};

export function normalizeReminderDays(days: number[]): number[] {
  const normalized = Array.from(new Set(days.map((value) => Math.trunc(value)))).filter(
    (value) => Number.isInteger(value) && value >= 0 && value <= 365,
  );

  if (normalized.length === 0) {
    return [...DEFAULT_RENEWAL_REMINDER_DAYS];
  }

  return normalized.sort((left, right) => right - left);
}

export function parseWorkspaceSettingsJson(raw: Prisma.JsonValue | null | undefined): WorkspaceSettingsV1 | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const parsed = WorkspaceSettingsV1Schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function mergeGeneral(
  base: ResolvedWorkspaceSettingsV1["general"],
  patch: NonNullable<PatchWorkspaceSettings["general"]>,
): ResolvedWorkspaceSettingsV1["general"] {
  return {
    defaultRenewalReminderDays:
      patch.defaultRenewalReminderDays !== undefined
        ? normalizeReminderDays(patch.defaultRenewalReminderDays)
        : base.defaultRenewalReminderDays,
    defaultTaskDueReminderDays:
      patch.defaultTaskDueReminderDays !== undefined
        ? normalizeReminderDays(patch.defaultTaskDueReminderDays)
        : base.defaultTaskDueReminderDays,
    inactivityThresholdDays:
      patch.inactivityThresholdDays !== undefined ? patch.inactivityThresholdDays : base.inactivityThresholdDays,
    inactivityReminderIntervalDays:
      patch.inactivityReminderIntervalDays !== undefined
        ? patch.inactivityReminderIntervalDays
        : base.inactivityReminderIntervalDays,
  };
}

function mergeInvoicing(
  base: ResolvedWorkspaceSettingsV1["invoicing"],
  patch: NonNullable<PatchWorkspaceSettings["invoicing"]>,
): ResolvedWorkspaceSettingsV1["invoicing"] {
  return {
    defaultCurrency: patch.defaultCurrency !== undefined ? patch.defaultCurrency : base.defaultCurrency,
    defaultPaymentTerms:
      patch.defaultPaymentTerms !== undefined ? patch.defaultPaymentTerms : base.defaultPaymentTerms,
    defaultTaxMode: patch.defaultTaxMode !== undefined ? patch.defaultTaxMode : base.defaultTaxMode,
  };
}

export function getWorkspaceSettingsWithDefaults(
  parsed: WorkspaceSettingsV1 | null,
): ResolvedWorkspaceSettingsV1 {
  const general = parsed?.general;
  const invoicing = parsed?.invoicing;

  return {
    v: 1,
    general: {
      defaultRenewalReminderDays: normalizeReminderDays(
        general?.defaultRenewalReminderDays ?? [...DEFAULT_RENEWAL_REMINDER_DAYS],
      ),
      defaultTaskDueReminderDays: normalizeReminderDays(
        general?.defaultTaskDueReminderDays ?? [...DEFAULT_TASK_DUE_REMINDER_DAYS],
      ),
      inactivityThresholdDays: general?.inactivityThresholdDays ?? DEFAULT_INACTIVITY_THRESHOLD_DAYS,
      inactivityReminderIntervalDays:
        general?.inactivityReminderIntervalDays ?? DEFAULT_INACTIVITY_REMINDER_INTERVAL_DAYS,
    },
    invoicing: {
      defaultCurrency: invoicing?.defaultCurrency ?? DEFAULT_INVOICE_CURRENCY,
      defaultPaymentTerms: invoicing?.defaultPaymentTerms ?? null,
      defaultTaxMode: invoicing?.defaultTaxMode ?? DEFAULT_INVOICE_TAX_MODE,
    },
  };
}

export function mergeWorkspaceSettings(
  existing: WorkspaceSettingsV1 | null,
  patch: PatchWorkspaceSettings,
): WorkspaceSettingsV1 {
  const resolved = getWorkspaceSettingsWithDefaults(existing);
  const nextGeneral = patch.general ? mergeGeneral(resolved.general, patch.general) : resolved.general;
  const nextInvoicing = patch.invoicing ? mergeInvoicing(resolved.invoicing, patch.invoicing) : resolved.invoicing;

  return {
    v: 1,
    general: {
      defaultRenewalReminderDays: nextGeneral.defaultRenewalReminderDays,
      defaultTaskDueReminderDays: nextGeneral.defaultTaskDueReminderDays,
      inactivityThresholdDays: nextGeneral.inactivityThresholdDays,
      inactivityReminderIntervalDays: nextGeneral.inactivityReminderIntervalDays,
    },
    invoicing: {
      defaultCurrency: nextInvoicing.defaultCurrency,
      defaultPaymentTerms: nextInvoicing.defaultPaymentTerms,
      defaultTaxMode: nextInvoicing.defaultTaxMode,
    },
  };
}

export function getIntegrationStatus(): IntegrationStatus {
  const storageConfigured = Boolean(
    env.STORAGE_ENDPOINT?.trim() &&
      env.STORAGE_BUCKET?.trim() &&
      env.STORAGE_ACCESS_KEY_ID?.trim() &&
      env.STORAGE_SECRET_ACCESS_KEY?.trim(),
  );

  const vaultConfigured = Boolean(
    env.VAULTWARDEN_URL?.trim() &&
      env.VAULTWARDEN_EMAIL?.trim() &&
      env.VAULTWARDEN_MASTER_PASSWORD?.trim() &&
      env.VAULTWARDEN_CLIENT_ID?.trim() &&
      env.VAULTWARDEN_CLIENT_SECRET?.trim(),
  );

  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.INVOICE_EMAIL_FROM?.trim(),
  );

  const upstashConfigured = Boolean(env.UPSTASH_REDIS_REST_URL?.trim() && env.UPSTASH_REDIS_REST_TOKEN?.trim());

  return {
    database: true,
    storage: storageConfigured,
    vault: vaultConfigured,
    email: emailConfigured,
    upstash: upstashConfigured,
  };
}

export function settingsPatchSections(patch: PatchWorkspaceSettings): Array<"general" | "invoicing"> {
  const sections: Array<"general" | "invoicing"> = [];
  if (patch.general) sections.push("general");
  if (patch.invoicing) sections.push("invoicing");
  return sections;
}
