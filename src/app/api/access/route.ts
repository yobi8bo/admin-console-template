import { authOptions } from "@/lib/auth";
import { canAccessPage } from "@/lib/page-access";
import { PAGE_PERMISSIONS } from "@/lib/page-permissions";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  userId: z.string().min(1),
});

const upsertSchema = z.object({
  pageKey: z.string().min(1),
  allowed: z.boolean(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canAccessPage(session.user.id, session.user.roles, "access"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ userId: url.searchParams.get("userId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const roleRows = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: { select: { name: true } } },
    take: 1,
  });
  const targetRoles = roleRows.map((r) => r.role.name);
  const targetIsAdmin = isAdmin(targetRoles);

  const rows = await prisma.userPageAccess.findMany({
    where: { userId: user.id },
    select: { pageKey: true, allowed: true },
    take: 1000,
  });
  const map = new Map(rows.map((r) => [r.pageKey, r.allowed]));

  const items = PAGE_PERMISSIONS.map((p) => {
    const locked = !!p.alwaysAllow || !!p.adminOnly;
    const effectiveAllowed = p.alwaysAllow
      ? true
      : p.adminOnly
        ? targetIsAdmin
        : targetIsAdmin
          ? true
          : map.get(p.key) ?? false;

    return {
      key: p.key,
      label: p.label,
      path: p.path,
      adminOnly: !!p.adminOnly,
      alwaysAllow: !!p.alwaysAllow,
      locked,
      allowed: effectiveAllowed,
      storedAllowed: map.has(p.key) ? map.get(p.key) : null,
    };
  });

  return NextResponse.json({ data: { user, items } });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canAccessPage(session.user.id, session.user.roles, "access"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({ userId: url.searchParams.get("userId") });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsedBody = upsertSchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Bad Request", issues: parsedBody.error.issues },
      { status: 400 }
    );
  }

  const meta = PAGE_PERMISSIONS.find((p) => p.key === parsedBody.data.pageKey);
  if (!meta) return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  if (meta.alwaysAllow || meta.adminOnly) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  await prisma.userPageAccess.upsert({
    where: {
      userId_pageKey: { userId: parsedQuery.data.userId, pageKey: parsedBody.data.pageKey },
    },
    update: { allowed: parsedBody.data.allowed },
    create: {
      userId: parsedQuery.data.userId,
      pageKey: parsedBody.data.pageKey,
      allowed: parsedBody.data.allowed,
    },
  });

  return NextResponse.json({ data: { ok: true } });
}

