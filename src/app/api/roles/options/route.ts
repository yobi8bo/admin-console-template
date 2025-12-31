import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessPage } from "@/lib/page-access";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canUsers = await canAccessPage(session.user.id, session.user.roles, "users");
  const canRoles = await canAccessPage(session.user.id, session.user.roles, "roles");
  if (!canUsers && !canRoles) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 1000,
  });

  return NextResponse.json({ data: { items: roles } });
}
