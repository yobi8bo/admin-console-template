import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { authOptions } from "@/lib/auth";
import { canAccessPage } from "@/lib/page-access";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().min(1).optional().nullable(),
  password: z.string().min(6).optional(),
  roleId: z.string().min(1).optional().nullable(),
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
  if (!(await canAccessPage(session.user.id, session.user.roles, "users"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      roles: {
        select: { role: { select: { id: true, name: true } } },
        take: 1,
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      role: user.roles[0]?.role ?? null,
    },
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
  if (!(await canAccessPage(session.user.id, session.user.roles, "users"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad Request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id } = await context.params;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          email: parsed.data.email,
          name: parsed.data.name === undefined ? undefined : parsed.data.name,
          passwordHash: parsed.data.password
            ? await hashPassword(parsed.data.password)
            : undefined,
        },
        select: { id: true },
      });

      if (parsed.data.roleId !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: user.id } });
        if (parsed.data.roleId) {
          await tx.userRole.create({ data: { userId: user.id, roleId: parsed.data.roleId } });
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          roles: {
            select: { role: { select: { id: true, name: true } } },
            take: 1,
          },
        },
      });
    });
    return NextResponse.json({
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        createdAt: updated.createdAt.toISOString(),
        role: updated.roles[0]?.role ?? null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
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
  if (!(await canAccessPage(session.user.id, session.user.roles, "users"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  await prisma.user.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ data: { ok: true } });
}
