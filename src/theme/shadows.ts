import { Platform, ViewStyle } from "react-native";
import { COLORS } from "./colors";

type CrossPlatformShadow = ViewStyle & {
  boxShadow?: string;
};

export const SHADOWS = {
  soft: Platform.select({
    ios: {
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    android: {
      elevation: 4,
    },
    default: {
      boxShadow: "0 10px 30px rgba(27, 18, 64, 0.08)",
    },
  }) as CrossPlatformShadow,
  medium: Platform.select({
    ios: {
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: {
      elevation: 7,
    },
    default: {
      boxShadow: "0 14px 36px rgba(27, 18, 64, 0.12)",
    },
  }) as CrossPlatformShadow,
};
