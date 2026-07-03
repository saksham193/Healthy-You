import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AnimatedMedibot, { type MedibotAnimationState } from "../medibot/AnimatedMedibot";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type FloatingMedibotButtonProps = {
  onPress?: () => void;
  state?: MedibotAnimationState;
};

export default function FloatingMedibotButton({ onPress, state = "idle" }: FloatingMedibotButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel="Open Medibot assistant"
      accessibilityRole="button"
      activeOpacity={0.86}
      onPress={onPress}
      style={styles.button}
    >
      <View style={styles.botFace}>
        <AnimatedMedibot
          accessibilityLabel="Animated Medibot assistant"
          size={48}
          state={state}
        />
      </View>
      <Text numberOfLines={1} style={styles.label}>Medibot</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderColor: COLORS.secondary,
    borderRadius: 44,
    borderWidth: 4,
    bottom: 86,
    height: 88,
    justifyContent: "center",
    position: "absolute",
    right: SPACING.xl,
    width: 88,
    zIndex: 20,
    ...SHADOWS.medium,
  },
  botFace: {
    alignItems: "center",
    borderRadius: 32,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  label: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: -SPACING.xs / 2,
    textAlign: "center",
  },
});
