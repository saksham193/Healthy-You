const BRAND = {
  aqua: "#20D6D2",
  cyan: "#25D4E8",
  deepBlue: "#0F7FB7",
  softBlue: "#E7FBFE",
  navy: "#064B76",
} as const;

const DATA = {
  primary: "#FFD84D",
  secondary: "#FACC15",
  dark: "#854D0E",
  light: "#FFF8D6",
  ink: "#713F12",
} as const;

const SCHEDULE = {
  primary: "#FF8EC5",
  secondary: "#FFC2DD",
  dark: "#9D2860",
  light: "#FFE3F1",
  ink: "#61133A",
} as const;

const NUTRITION = {
  primary: "#8AF2B2",
  secondary: "#4ADE80",
  dark: "#168A45",
  light: "#F0FFF6",
  ink: "#064E3B",
} as const;

const FITNESS = {
  primary: "#8B5CF6",
  secondary: "#A78BFA",
  dark: "#6D28D9",
  light: "#F3E8FF",
  ink: "#4C1D95",
} as const;

export const COLORS = {
  primary: BRAND.aqua,
  secondary: BRAND.cyan,
  primaryDark: BRAND.deepBlue,
  purpleDeep: BRAND.navy,
  purpleInk: "#052D4E",
  primaryLight: BRAND.softBlue,
  brandAqua: BRAND.aqua,
  brandCyan: BRAND.cyan,
  brandDeepBlue: BRAND.deepBlue,
  brandSoftBlue: BRAND.softBlue,
  dataYellow: DATA.primary,
  dataYellowSecondary: DATA.secondary,
  dataYellowDark: DATA.dark,
  dataYellowLight: DATA.light,
  dataYellowInk: DATA.ink,
  dataLime: DATA.primary,
  dataLimeSecondary: DATA.secondary,
  dataLimeDark: DATA.dark,
  dataLimeLight: DATA.light,
  dataLimeInk: DATA.ink,
  schedulePink: SCHEDULE.primary,
  schedulePinkSecondary: SCHEDULE.secondary,
  schedulePinkDark: SCHEDULE.dark,
  schedulePinkLight: SCHEDULE.light,
  schedulePinkInk: SCHEDULE.ink,
  accent: NUTRITION.secondary,
  accentLight: NUTRITION.light,
  warning: "#F7B955",
  warningLight: "#FFF6E6",
  danger: "#EF5A6F",
  dangerLight: "#FDECEF",
  background: "#F6FBFD",
  surface: "#FFFFFF",
  surfaceMuted: "#EDF6F8",
  white: "#FFFFFF",
  text: "#17252F",
  textMuted: "#647682",
  gray: "#7D7D7D",
  border: "#DDECEF",
  shadow: "#083B66",
  overlaySoft: "rgba(255,255,255,0.16)",
  overlaySubtle: "rgba(255,255,255,0.12)",
  success: NUTRITION.secondary,
  cyan: BRAND.cyan,
  nutritionPrimary: NUTRITION.primary,
  nutritionSecondary: NUTRITION.secondary,
  nutritionDark: NUTRITION.dark,
  nutritionLight: NUTRITION.light,
  nutritionInk: NUTRITION.ink,
  fitnessPrimary: FITNESS.primary,
  fitnessSecondary: FITNESS.secondary,
  fitnessDark: FITNESS.dark,
  fitnessLight: FITNESS.light,
  fitnessInk: FITNESS.ink,
  black: "#111111",
};

export const NUTRITION_COLORS = {
  primary: NUTRITION.primary,
  secondary: NUTRITION.secondary,
  dark: NUTRITION.dark,
  light: NUTRITION.light,
  ink: NUTRITION.ink,
} as const;

export const DATA_COLORS = {
  primary: DATA.primary,
  secondary: DATA.secondary,
  dark: DATA.dark,
  light: DATA.light,
  ink: DATA.ink,
} as const;

export const SCHEDULE_COLORS = {
  primary: SCHEDULE.primary,
  secondary: SCHEDULE.secondary,
  dark: SCHEDULE.dark,
  light: SCHEDULE.light,
  ink: SCHEDULE.ink,
} as const;

export const FITNESS_COLORS = {
  primary: FITNESS.primary,
  secondary: FITNESS.secondary,
  dark: FITNESS.dark,
  light: FITNESS.light,
  ink: FITNESS.ink,
} as const;
