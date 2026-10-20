"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Courbe des vues cumulées sur 30 jours (couleurs issues des design tokens). */
export function ViewsChart({ data, locale, label }: { data: { day: string; views: number }[]; locale: string; label: string }) {
  const fmtDay = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const fmtNum = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { notation: "compact" });
  return (
    <div className="h-56 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--forest-600)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--forest-600)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={(d: string) => fmtDay.format(new Date(`${d}T12:00:00Z`))} tick={{ fontSize: 12, fill: "var(--text-3)" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tickFormatter={(n: number) => fmtNum.format(n)} tick={{ fontSize: 12, fill: "var(--text-3)" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            formatter={(value) => [fmtNum.format(Number(value)), label]}
            labelFormatter={(d) => fmtDay.format(new Date(`${String(d)}T12:00:00Z`))}
            contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }}
          />
          <Area type="monotone" dataKey="views" stroke="var(--forest-700)" strokeWidth={2} fill="url(#viewsFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
