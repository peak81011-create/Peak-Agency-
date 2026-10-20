import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Étapes numérotées (accueil client). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={on ? "step" : undefined}>
            <span
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-full border-2 text-[13px] font-bold",
                done && "border-accent bg-accent text-accent-foreground",
                on && "border-primary bg-primary text-primary-foreground",
                !done && !on && "border-border-strong bg-card text-subtle-foreground",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-sm font-medium", on ? "font-semibold text-foreground" : "text-subtle-foreground")}>
              {label}
            </span>
            {i < steps.length - 1 ? <span aria-hidden className="mx-1 h-0.5 w-6 bg-border-strong md:w-10" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
