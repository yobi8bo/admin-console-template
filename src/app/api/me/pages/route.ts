import { authOptions } from "@/lib/auth";
import { getAllowedPageKeysForUser } from "@/lib/page-access";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await getAllowedPageKeysForUser(session.user.id, session.user.roles);
  return NextResponse.json({ data: { keys } });
}

