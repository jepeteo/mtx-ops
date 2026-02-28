import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { env } from "../src/lib/env";

const db = new PrismaClient();

async function main() {
  let workspace = await db.workspace.findFirst({ where: { name: "MTX Studio" } });
  if (!workspace) {
    workspace = await db.workspace.create({ data: { name: "MTX Studio" } });
  }

  const ownerEmail = (env.SEED_OWNER_EMAIL ?? "owner@mtxstudio.com").toLowerCase();
  const ownerPassword = env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hashPassword(ownerPassword);

  await db.user.upsert({
    where: { email: ownerEmail },
    update: {
      workspaceId: workspace.id,
      role: "OWNER",
      passwordHash,
      status: "ACTIVE",
      name: "Owner",
    },
    create: {
      workspaceId: workspace.id,
      email: ownerEmail,
      role: "OWNER",
      passwordHash,
      status: "ACTIVE",
      name: "Owner",
    },
  });

  console.log(`Seed complete: workspace=MTX Studio, owner=${ownerEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
