import { requirePageAccess } from "@/lib/require-page";
import RolesClient from "./RolesClient";

export default async function RolesPage() {
  await requirePageAccess("roles");
  return <RolesClient />;
}

