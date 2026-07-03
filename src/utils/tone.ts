import {
  COLORS,
  DATA_COLORS,
  FITNESS_COLORS,
  NUTRITION_COLORS,
  SCHEDULE_COLORS,
} from "../theme/colors";
import type { Tone } from "../types";

export type ToneColors = {
  foreground: string;
  background: string;
};

const IDENTITY_TONES = {
  amber: {
    foreground: "#B45309",
    background: "#FFF4DB",
  },
  blue: {
    foreground: "#0369A1",
    background: "#E6F7FF",
  },
  coral: {
    foreground: "#C2413D",
    background: "#FFF0EE",
  },
  green: {
    foreground: "#168A45",
    background: "#ECFDF3",
  },
  lavender: {
    foreground: "#7C3AED",
    background: "#F3E8FF",
  },
  mint: {
    foreground: "#0E9488",
    background: "#EAFFF8",
  },
  orange: {
    foreground: "#C75A00",
    background: "#FFF3D6",
  },
  rose: {
    foreground: "#BE123C",
    background: "#FFF1F2",
  },
  teal: {
    foreground: "#0F766E",
    background: "#E7FAF7",
  },
  violet: {
    foreground: "#6D28D9",
    background: "#F5F0FF",
  },
  yellowGreen: {
    foreground: "#5F870B",
    background: "#F7FCE5",
  },
} satisfies Record<string, ToneColors>;

const normalizeKey = (value: string): string => value.trim().toLowerCase();

export function getToneColors(tone: Tone) {
  const tones: Record<Tone, ToneColors> = {
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

export function getFitnessToneColors(tone: Tone): ToneColors {
  if (tone === "primary") {
    return {
      foreground: FITNESS_COLORS.primary,
      background: FITNESS_COLORS.light,
    };
  }

  return getToneColors(tone);
}

export function getDataToneColors(tone: Tone): ToneColors {
  if (tone === "primary" || tone === "accent") {
    return {
      foreground: DATA_COLORS.ink,
      background: DATA_COLORS.light,
    };
  }

  return getToneColors(tone);
}

export function getHomeFeatureToneColors(featureId: string, tone: Tone): ToneColors {
  if (featureId === "nutrition") {
    return {
      foreground: NUTRITION_COLORS.dark,
      background: NUTRITION_COLORS.light,
    };
  }

  if (featureId === "fitness") {
    return {
      foreground: FITNESS_COLORS.primary,
      background: FITNESS_COLORS.light,
    };
  }

  if (featureId === "sleep") {
    return {
      foreground: COLORS.warning,
      background: COLORS.warningLight,
    };
  }

  if (featureId === "schedule") {
    return {
      foreground: SCHEDULE_COLORS.dark,
      background: SCHEDULE_COLORS.light,
    };
  }

  if (featureId === "data" || featureId === "analytics") {
    return getDataToneColors("accent");
  }

  return getToneColors(tone);
}

export function getNutritionToneColors(tone: Tone): ToneColors {
  if (tone === "primary" || tone === "accent") {
    return {
      foreground: NUTRITION_COLORS.secondary,
      background: NUTRITION_COLORS.light,
    };
  }

  return getToneColors(tone);
}

export function getNutritionMealToneColors(mealId: string, mealName: string): ToneColors {
  const key = normalizeKey(mealId || mealName);

  if (key.includes("breakfast")) return IDENTITY_TONES.orange;
  if (key.includes("lunch")) return IDENTITY_TONES.green;
  if (key.includes("dinner")) return IDENTITY_TONES.teal;
  if (key.includes("snack")) return IDENTITY_TONES.mint;

  return getNutritionToneColors("accent");
}

export function getNutritionMacroToneColors(macroId: string, tone: Tone): ToneColors {
  const key = normalizeKey(macroId);

  if (key.includes("protein")) return IDENTITY_TONES.blue;
  if (key.includes("carb")) return IDENTITY_TONES.green;
  if (key.includes("fat")) return IDENTITY_TONES.orange;
  if (key.includes("fiber")) return IDENTITY_TONES.mint;

  return getNutritionToneColors(tone);
}

export function getNutritionInsightToneColors(
  insightId: string,
  title: string,
  tone: Tone,
): ToneColors {
  const key = normalizeKey(`${insightId} ${title}`);

  if (key.includes("hydration") || key.includes("water")) return IDENTITY_TONES.blue;
  if (key.includes("protein")) return IDENTITY_TONES.green;
  if (key.includes("calorie")) return IDENTITY_TONES.amber;

  return getNutritionToneColors(tone);
}

export function getNutritionInsightStatusToneColors(status: string): ToneColors {
  const key = normalizeKey(status);

  if (key.includes("attention") || key.includes("need")) return IDENTITY_TONES.blue;
  if (key.includes("track") || key.includes("good")) return IDENTITY_TONES.green;

  return getNutritionToneColors("accent");
}

export function getScheduleToneColors(tone: Tone): ToneColors {
  if (tone === "primary") {
    return {
      foreground: SCHEDULE_COLORS.dark,
      background: SCHEDULE_COLORS.light,
    };
  }

  if (tone === "accent") return IDENTITY_TONES.green;
  if (tone === "warning") return IDENTITY_TONES.amber;
  if (tone === "danger") return IDENTITY_TONES.coral;

  return getToneColors(tone);
}

export function getScheduleAppointmentToneColors(appointmentId: string, specialty: string): ToneColors {
  const key = normalizeKey(`${appointmentId} ${specialty}`);

  if (key.includes("cardio") || key.includes("heart")) return IDENTITY_TONES.rose;
  if (key.includes("dentist") || key.includes("dental")) return IDENTITY_TONES.blue;
  if (key.includes("checkup") || key.includes("check-up") || key.includes("health")) {
    return IDENTITY_TONES.teal;
  }

  return getScheduleToneColors("primary");
}

export function getScheduleHabitToneColors(habitId: string, title: string): ToneColors {
  const key = normalizeKey(`${habitId} ${title}`);

  if (key.includes("water")) return IDENTITY_TONES.blue;
  if (key.includes("stretch")) return IDENTITY_TONES.lavender;
  if (key.includes("meditation") || key.includes("mind")) return IDENTITY_TONES.violet;
  if (key.includes("walk") || key.includes("steps")) return IDENTITY_TONES.yellowGreen;
  if (key.includes("vitamin") || key.includes("med")) return IDENTITY_TONES.coral;

  return getScheduleToneColors("primary");
}
