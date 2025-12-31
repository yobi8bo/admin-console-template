import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { PAGE_PERMISSIONS } from "@/lib/page-permissions";

export async function getAllowedPageKeysForUser(userId: string, roles: string[]) {
  if (isAdmin(roles)) return PAGE_PERMISSIONS.map((p) => p.key);

  const always = PAGE_PERMISSIONS.filter((p) => p.alwaysAllow).map((p) => p.key);
  const rows = await prisma.userPageAccess.findMany({
    where: { userId, allowed: true },
    select: { pageKey: true },
    take: 1000,
  });
  return Array.from(new Set([...always, ...rows.map((r) => r.pageKey)]));
}

export async function canAccessPage(userId: string, roles: string[], pageKey: string) {
  const meta = PAGE_PERMISSIONS.find((p) => p.key === pageKey);
  if (meta?.alwaysAllow) return true;
  if (isAdmin(roles)) return true;
  if (meta?.adminOnly) return false;

  const row = await prisma.userPageAccess.findUnique({
    where: { userId_pageKey: { userId, pageKey } },
    select: { allowed: true },
  });
  return row?.allowed ?? false;
}
