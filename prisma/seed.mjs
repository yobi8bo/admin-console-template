import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  const passwordHash = await hash(password, 12);

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  const [adminRole, userRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "管理员" },
      update: { description: "管理员" },
      create: { name: "管理员", description: "管理员" },
    }),
    prisma.role.upsert({
      where: { name: "用户" },
      update: { description: "用户" },
      create: { name: "用户", description: "用户" },
    }),
  ]);

  await prisma.userRole.deleteMany({ where: { userId: adminUser.id } });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log(`Seeded admin user: ${email}`);
  console.log(`Seeded roles: ${adminRole.name}, ${userRole.name}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
