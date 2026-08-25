import type { Icon } from "@phosphor-icons/react";
import {
  Anchor,
  Barbell,
  Bicycle,
  BoxingGlove,
  Flame,
  Heartbeat,
  Lightning,
  Medal,
  Mountains,
  PersonSimpleRun,
  Sneaker,
  Waves,
} from "@phosphor-icons/react";

export const ROUTINE_ICONS: Record<string, Icon> = {
  barbell: Barbell,
  anchor: Anchor,
  sneaker: Sneaker,
  run: PersonSimpleRun,
  bike: Bicycle,
  boxing: BoxingGlove,
  flame: Flame,
  heart: Heartbeat,
  lightning: Lightning,
  medal: Medal,
  mountains: Mountains,
  waves: Waves,
};

export const ROUTINE_ICON_KEYS = Object.keys(ROUTINE_ICONS);
