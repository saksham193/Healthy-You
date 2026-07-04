import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getFitnessToneColors } from "../../utils/tone";
import type { IconName, WorkoutPlan } from "../../types";

type WorkoutPlanCardProps = {
  workout: WorkoutPlan;
};

export default function WorkoutPlanCard({ workout }: WorkoutPlanCardProps) {
  const tone = getFitnessToneColors(workout.tone);
  const isCompleted = workout.status === "completed";
  const statusIcon: IconName = isCompleted ? "checkmark-circle" : "ellipse-outline";
  const statusLabel = workout.status.charAt(0).toUpperCase() + workout.status.slice(1);

  return (
    <CustomCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons color={tone.foreground} name={workout.iconName} size={22} />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{workout.name}</Text>
        <Text numberOfLines={1} style={styles.meta}>{workout.duration}</Text>
      </View>
      <View style={styles.trailing}>
        <View style={[styles.badge, { backgroundColor: tone.background }]}>
          <Text numberOfLines={1} style={[styles.badgeText, { color: tone.foreground }]}>{workout.difficulty}</Text>
        </View>
        <View style={styles.statusRow}>
          <Ionicons
            color={isCompleted ? COLORS.accent : COLORS.textMuted}
            name={statusIcon}
            size={18}
          />
          <Text numberOfLines={1} style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.md,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.md,
  },
  content: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  trailing: {
    alignItems: "flex-end",
    alignSelf: "flex-start",
    gap: SPACING.sm,
    minWidth: 96,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.xs,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  badge: {
    borderRadius: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
