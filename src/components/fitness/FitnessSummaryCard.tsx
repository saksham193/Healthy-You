import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS, FITNESS_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { FitnessSummary, ProfileData } from "../../types";

type FitnessSummaryCardProps = {
  onTimerPress?: () => void;
  profile?: ProfileData | null;
  summary: FitnessSummary;
};

export default function FitnessSummaryCard({
  onTimerPress,
  profile,
  summary,
}: FitnessSummaryCardProps) {
  const healthStatus = profile?.summary.healthStatus ?? summary.scoreLabel;

  return (
    <CustomCard style={styles.card}>
      <View style={styles.content}>
        <View>
          <Text style={styles.eyebrow}>Fitness Summary</Text>
          <Text style={styles.title}>BMI {summary.bmi}</Text>
          <Text style={styles.subtitle}>{summary.bmiStatus}</Text>
        </View>
        <View style={styles.statusPill}>
          <Ionicons color={COLORS.accent} name="shield-checkmark-outline" size={18} />
          <Text style={styles.statusText}>{healthStatus}</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityLabel="Workout Timer"
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onTimerPress}
        style={styles.timerButton}
      >
        <Ionicons color={COLORS.white} name="timer-outline" size={20} />
        <Text style={styles.timerText}>Workout Timer</Text>
      </TouchableOpacity>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.lg,
  },
  content: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: COLORS.accentLight,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  statusText: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  timerButton: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.primary,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    padding: SPACING.md,
  },
  timerText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
