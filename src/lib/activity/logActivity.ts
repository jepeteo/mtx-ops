import { db } from "@/lib/db/db";
import { z } from "zod";

const Schema = z.object({
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export async function logActivity(input: z.infer<typeof Schema>) {
  const parsed = Schema.parse(input);
  await db.activityLog.create({
    data: {
      workspaceId: parsed.workspaceId,
      actorId: parsed.actorId,
      action: parsed.action,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      metadata: parsed.metadata ?? {},
    },
  });
}
