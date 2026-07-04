import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { MedibotPrompt } from "../../types";

type SuggestedPromptChipProps = {
  prompt: MedibotPrompt;
  onPress: (label: string) => void;
};

export default function SuggestedPromptChip({ prompt, onPress }: SuggestedPromptChipProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={prompt.label}
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={() => onPress(prompt.label)}
      style={styles.chip}
    >
      <Text numberOfLines={2} style={styles.label}>{prompt.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.border,
    borderRadius: SPACING.xl,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  label: {
    color: COLORS.primaryDark,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
  },
});
