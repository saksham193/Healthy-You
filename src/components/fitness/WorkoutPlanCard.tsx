import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getFitnessToneColors } from "../../utils/tone";
import type { IconName, WorkoutPlan } from "../../types";

type WorkoutPlanCardProps = {
  completedAt?: string;
  isCompletedToday?: boolean;
  onComplete?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onStart?: () => void;
  onUndoComplete?: () => void;
  restrictionLabel?: string;
  workout: WorkoutPlan;
};

export default function WorkoutPlanCard({
  completedAt,
  isCompletedToday,
  onComplete,
  onDelete,
  onEdit,
  onStart,
  onUndoComplete,
  restrictionLabel,
  workout,
}: WorkoutPlanCardProps) {
  const tone = getFitnessToneColors(workout.tone);
  const isCompleted = Boolean(isCompletedToday);
  const statusIcon: IconName = isCompleted ? "checkmark-circle" : "ellipse-outline";
  const statusLabel = isCompleted
    ? "Completed"
    : workout.status.charAt(0).toUpperCase() + workout.status.slice(1);

  return (
    <CustomCard style={[styles.card, isCompleted && styles.completedCard]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons color={tone.foreground} name={workout.iconName} size={22} />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{workout.name}</Text>
        <Text numberOfLines={1} style={styles.meta}>{workout.duration}</Text>
        {workout.notes ? (
          <Text numberOfLines={2} style={styles.note}>{workout.notes}</Text>
        ) : null}
        {workout.userRestrictions?.length ? (
          <Text numberOfLines={2} style={styles.restrictions}>
            Restrictions: {workout.userRestrictions.join(", ")}
          </Text>
        ) : null}
        {restrictionLabel ? (
          <Text numberOfLines={2} style={styles.restrictionWarning}>{restrictionLabel}</Text>
        ) : null}
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
        {completedAt ? (
          <Text numberOfLines={1} style={styles.completedAt}>{completedAt}</Text>
        ) : null}
        {isCompleted ? (
          <TouchableOpacity
            accessibilityLabel={`Undo ${workout.name} completion`}
            accessibilityRole="button"
            activeOpacity={0.76}
            onPress={onUndoComplete}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Undo</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionStack}>
            <TouchableOpacity
              accessibilityLabel={`Start ${workout.name}`}
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={onStart}
              style={[styles.completeButton, { backgroundColor: tone.foreground }]}
            >
              <Ionicons color={COLORS.white} name="play" size={16} />
              <Text style={styles.completeButtonText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Mark ${workout.name} complete`}
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={onComplete}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.editRow}>
          <TouchableOpacity
            accessibilityLabel={workout.isCustom ? `Edit ${workout.name}` : `Customize ${workout.name}`}
            accessibilityRole="button"
            activeOpacity={0.76}
            onPress={onEdit}
            style={styles.iconButton}
          >
            <Ionicons color={COLORS.textMuted} name={workout.isCustom ? "create-outline" : "copy-outline"} size={16} />
          </TouchableOpacity>
          {workout.isCustom ? (
            <TouchableOpacity
              accessibilityLabel={`Delete ${workout.name}`}
              accessibilityRole="button"
              activeOpacity={0.76}
              onPress={onDelete}
              style={styles.iconButton}
            >
              <Ionicons color={COLORS.danger} name="trash-outline" size={16} />
            </TouchableOpacity>
          ) : null}
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
  completedCard: {
    borderColor: COLORS.accentLight,
    borderWidth: 1,
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
  note: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  restrictions: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  restrictionWarning: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  trailing: {
    alignItems: "flex-end",
    alignSelf: "flex-start",
    gap: SPACING.sm,
    minWidth: 116,
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
  completedAt: {
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
  completeButton: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    minHeight: 34,
    paddingHorizontal: SPACING.md,
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.lg,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  actionStack: {
    alignItems: "flex-end",
    gap: SPACING.sm,
  },
  editRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.lg,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
});
