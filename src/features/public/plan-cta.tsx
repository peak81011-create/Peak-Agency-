import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { SessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * Bouton « Choisir cette offre » : inscription, ou choix direct si déjà client.
 * Une offre du catalogue intégré (pas encore en base) mène à l'inscription
 * simple : l'offre sera choisie dans l'espace.
 */
export function PlanCta({
  planId,
  featured,
  user,
  label,
  className,
}: {
  planId: string;
  featured: boolean;
  user: SessionUser | null;
  label: string;
  className?: string;
}) {
  const catalog = planId.startsWith("catalog-");
  const query = catalog ? {} : { plan: planId };
  const href = user?.role === "client" ? { pathname: "/app/plan", query } : { pathname: "/signup", query };
  return (
    <Link href={href} className={cn(buttonVariants({ variant: featured ? "accent" : "primary", block: true, size: "lg" }), className)}>
      {label}
    </Link>
  );
}
