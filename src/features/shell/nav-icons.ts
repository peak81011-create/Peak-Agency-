import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Clapperboard,
  CreditCard,
  FileText,
  Film,
  Home,
  IdCard,
  Inbox,
  Landmark,
  LineChart,
  SlidersHorizontal,
  Tag,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
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
  film: Film,
  upload: Upload,
  at: AtSign,
  inbox: Inbox,
  video: Clapperboard,
  users: UsersRound,
};
