import { requirePageAccess } from "@/lib/require-page";
import AccessClient from "./AccessClient";

export default async function AccessPage() {
  await requirePageAccess("access");
  return <AccessClient />;
}

