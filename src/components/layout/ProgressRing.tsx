import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../theme/colors";
import { TYPOGRAPHY } from "../../theme/typography";

type ProgressRingProps = {
  value: number;
  max: number;
  size?: number;
};

export default function ProgressRing({ value, max, size = 88 }: ProgressRingProps) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  const borderWidth = Math.max(6, Math.round(size * 0.09));

  return (
    <View
      style={[
        styles.ring,
        {
          borderWidth,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <Text style={styles.value}>{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
    justifyContent: "center",
  },
  value: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
});
