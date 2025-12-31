import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().min(1).optional().nullable(),
  password: z.string().min(6).optional(),
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

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  return NextResponse.json({
    data: { ...user, createdAt: user.createdAt.toISOString() },
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
    const updated = await prisma.user.update({
      where: { id },
      data: {
        email: parsed.data.email,
        name: parsed.data.name === undefined ? undefined : parsed.data.name,
        passwordHash: parsed.data.password
          ? await hashPassword(parsed.data.password)
          : undefined,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return NextResponse.json({
      data: { ...updated, createdAt: updated.createdAt.toISOString() },
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

  const { id } = await context.params;
  await prisma.user.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ data: { ok: true } });
}

