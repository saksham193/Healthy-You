import { COLORS } from "../theme/colors";
import type { Tone } from "../types";

export function getToneColors(tone: Tone) {
  const tones = {
    primary: {
      foreground: COLORS.primary,
      background: COLORS.primaryLight,
    },
    accent: {
      foreground: COLORS.accent,
      background: COLORS.accentLight,
    },
    warning: {
      foreground: COLORS.warning,
      background: COLORS.warningLight,
    },
    danger: {
      foreground: COLORS.danger,
      background: COLORS.dangerLight,
    },
  };

  return tones[tone];
}
