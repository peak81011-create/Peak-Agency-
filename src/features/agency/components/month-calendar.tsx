import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CalendarEvent = { id: string; date: string; label: string; href: string; tone: string };

/** Calendrier mensuel simple (lundi en premier), événements cliquables. */
export function MonthCalendar({ month, events, locale }: { month: Date; events: CalendarEvent[]; locale: Locale }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(Date.UTC(year, m, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => i - offset + 1);
  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "short", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {weekdays.map((w) => (
        <div key={w} className="bg-sage-50 px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-subtle-foreground">
          {w}
        </div>
      ))}
      {cells.map((d, i) => {
        const inMonth = d >= 1 && d <= days;
        const iso = inMonth ? new Date(Date.UTC(year, m, d)).toISOString().slice(0, 10) : "";
        const dayEvents = inMonth ? events.filter((e) => e.date.slice(0, 10) === iso) : [];
        return (
          <div key={i} className={cn("flex min-h-16 flex-col gap-1 p-1 md:min-h-28 md:p-2", inMonth ? "bg-card" : "bg-paper")}>
            {inMonth ? (
              <span
                className={cn(
                  "text-xs font-semibold text-muted-foreground",
                  iso === today && "inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {d}
              </span>
            ) : null}
            {dayEvents.map((e) => (
              <Link key={e.id} href={e.href} className={cn("truncate rounded-xs px-1.5 py-0.5 text-[11px] font-semibold no-underline", e.tone)}>
                {e.label}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
