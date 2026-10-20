import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: { cls: "bg-t-blue-bg text-t-blue-fg", Icon: Info },
  warn: { cls: "bg-t-amber-bg text-t-amber-fg", Icon: TriangleAlert },
  error: { cls: "bg-t-red-bg text-t-red-fg", Icon: CircleAlert },
  ok: { cls: "bg-t-green-bg text-t-green-fg", Icon: CircleCheck },
} as const;

export function Callout({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-md px-4 py-3.5 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
