import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessPage } from "@/lib/page-access";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().optional().default(""),
});

const createRoleSchema = z.object({
  name: z.string().trim().min(1),
  description: z
    .enum(["用户", "管理员"])
    .optional(),
});

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canAccessPage(session.user.id, session.user.roles, "roles"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    q: url.searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const { page, pageSize, q } = parsed.data;
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, items] = await Promise.all([
    prisma.role.count({ where }),
    prisma.role.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, description: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    data: {
      items: items.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      total,
      page,
      pageSize,
    },
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canAccessPage(session.user.id, session.user.roles, "roles"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createRoleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad Request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.role.create({
      data: { name: parsed.data.name, description: parsed.data.description },
      select: { id: true, name: true, description: true, createdAt: true },
    });
    return NextResponse.json(
      { data: { ...created, createdAt: created.createdAt.toISOString() } },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Role name already exists" }, { status: 409 });
    }
    throw error;
  }
}
