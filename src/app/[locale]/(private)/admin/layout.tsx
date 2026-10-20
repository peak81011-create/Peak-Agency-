import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { isStaff, requireUser } from "@/lib/auth/session";

// Espace équipe : chaque page vérifie ensuite sa propre permission.
export default async function StaffAreaLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!isStaff(user)) redirect({ href: "/app", locale: await getLocale() });
  return children;
}
