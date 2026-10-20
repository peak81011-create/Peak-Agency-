import type { ReactNode } from "react";
import { Card } from "./card";

/** Chiffre clé (maquette : libellé, valeur en Archivo, détail). */
export function Stat({ label, value, detail, testId }: { label: string; value: ReactNode; detail?: ReactNode; testId?: string }) {
  return (
    <Card className="flex flex-col gap-1.5" data-testid={testId}>
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="font-display text-[26px] font-bold leading-tight tabular-nums md:text-[32px] [font-stretch:112%]">{value}</p>
      {detail ? <p className="text-xs text-subtle-foreground">{detail}</p> : null}
    </Card>
  );
}
