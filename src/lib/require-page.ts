import { authOptions } from "@/lib/auth";
import { canAccessPage } from "@/lib/page-access";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export async function requirePageAccess(pageKey: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const ok = await canAccessPage(session.user.id, session.user.roles, pageKey);
  if (!ok) redirect("/dashboard");

  return session;
}

