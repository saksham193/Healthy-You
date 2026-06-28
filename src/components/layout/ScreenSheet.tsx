import React, { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";

type ScreenSheetProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export default function ScreenSheet({ children, style }: ScreenSheetProps) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -SPACING.lg,
    minHeight: 640,
    paddingBottom: SPACING.bottomNavOffset,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
});
