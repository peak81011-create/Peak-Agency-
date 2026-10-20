import type { LucideIcon } from "lucide-react";
import { Home, LineChart, UserRound } from "lucide-react";
import type { NavIconName } from "./nav";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  home: Home,
  chart: LineChart,
  user: UserRound,
};
