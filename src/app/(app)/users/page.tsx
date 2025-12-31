import { requirePageAccess } from "@/lib/require-page";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  await requirePageAccess("users");
  return <UsersClient />;
}

