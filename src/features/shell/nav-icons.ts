import type { LucideIcon } from "lucide-react";
import { CreditCard, FileText, Home, IdCard, Landmark, LineChart, SlidersHorizontal, Tag, UserRound } from "lucide-react";
import type { NavIconName } from "./nav";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  home: Home,
  chart: LineChart,
  user: UserRound,
  card: CreditCard,
  tag: Tag,
  file: FileText,
  sliders: SlidersHorizontal,
  idCard: IdCard,
  bank: Landmark,
};
