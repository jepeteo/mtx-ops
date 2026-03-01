import { db } from "@/lib/db/db";

type EntityType = "Client" | "Project" | "Task";

export async function entityExistsInWorkspace(input: {
  workspaceId: string;
  entityType: EntityType;
  entityId: string;
}) {
  if (input.entityType === "Client") {
    const entity = await db.client.findFirst({
      where: { id: input.entityId, workspaceId: input.workspaceId },
      select: { id: true },
    });
    return Boolean(entity);
  }

  if (input.entityType === "Project") {
    const entity = await db.project.findFirst({
      where: { id: input.entityId, workspaceId: input.workspaceId },
      select: { id: true },
    });
    return Boolean(entity);
  }

  const entity = await db.task.findFirst({
    where: { id: input.entityId, workspaceId: input.workspaceId },
    select: { id: true },
  });

  return Boolean(entity);
}
