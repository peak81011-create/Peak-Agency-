import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { SessionUser } from "@/lib/auth/session";

/** Bouton « Choisir cette offre » : inscription, ou choix direct si déjà client. */
export function PlanCta({ planId, featured, user, label }: { planId: string; featured: boolean; user: SessionUser | null; label: string }) {
  const href = user?.role === "client" ? { pathname: "/app/plan", query: { plan: planId } } : { pathname: "/signup", query: { plan: planId } };
  return (
    <Link href={href} className={buttonVariants({ variant: featured ? "accent" : "primary", block: true, size: "lg" })}>
      {label}
    </Link>
  );
}
