import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessPage } from "@/lib/page-access";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateRoleSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.union([z.enum(["用户", "管理员"]), z.null()]).optional(),
});

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canAccessPage(session.user.id, session.user.roles, "roles"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const role = await prisma.role.findUnique({
    where: { id },
    select: { id: true, name: true, description: true, createdAt: true },
  });
  if (!role) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  return NextResponse.json({
    data: { ...role, createdAt: role.createdAt.toISOString() },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canAccessPage(session.user.id, session.user.roles, "roles"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateRoleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad Request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  try {
    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description:
          parsed.data.description === undefined ? undefined : parsed.data.description,
      },
      select: { id: true, name: true, description: true, createdAt: true },
    });
    return NextResponse.json({
      data: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Role name already exists" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canAccessPage(session.user.id, session.user.roles, "roles"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  await prisma.role.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ data: { ok: true } });
}
