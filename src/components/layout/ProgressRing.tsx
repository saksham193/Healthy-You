import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../theme/colors";
import { TYPOGRAPHY } from "../../theme/typography";

type ProgressRingProps = {
  value: number;
  max: number;
  size?: number;
  color?: string;
  backgroundColor?: string;
  textColor?: string;
};

export default function ProgressRing({
  value,
  max,
  size = 88,
  color = COLORS.accent,
  backgroundColor = COLORS.accentLight,
  textColor,
}: ProgressRingProps) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  const borderWidth = Math.max(6, Math.round(size * 0.09));

  return (
    <View
      style={[
        styles.ring,
        {
          borderWidth,
          borderRadius: size / 2,
          backgroundColor,
          borderColor: color,
          height: size,
          width: size,
        },
      ]}
    >
      <Text style={[styles.value, { color: textColor ?? color }]}>{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
});
