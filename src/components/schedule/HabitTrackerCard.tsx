import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getScheduleHabitToneColors } from "../../utils/tone";
import type { Habit } from "../../types";

type HabitTrackerCardProps = {
  habit: Habit;
  completedAt?: string;
  isCompletedToday?: boolean;
  onComplete?: () => void;
  onUndoComplete?: () => void;
};

export default function HabitTrackerCard({
  completedAt,
  habit,
  isCompletedToday,
  onComplete,
  onUndoComplete,
}: HabitTrackerCardProps) {
  const tone = getScheduleHabitToneColors(habit.id, habit.title);
  const isCompleted = Boolean(isCompletedToday);

  return (
    <CustomCard style={[styles.card, { borderLeftColor: tone.foreground }, isCompleted && styles.completedCard]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons color={tone.foreground} name={habit.iconName} size={21} />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>{habit.title}</Text>
        <Text numberOfLines={1} style={styles.streak}>{habit.streak}</Text>
        {completedAt ? (
          <Text numberOfLines={1} style={styles.completedAt}>{completedAt}</Text>
        ) : null}
      </View>
      <View style={[styles.checkChip, { backgroundColor: isCompleted ? tone.background : COLORS.surfaceMuted }]}>
        <Ionicons
          color={isCompleted ? tone.foreground : COLORS.textMuted}
          name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
          size={14}
        />
        <Text style={[styles.checkText, { color: isCompleted ? tone.foreground : COLORS.textMuted }]}>
          {isCompleted ? "Done" : "Due"}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityLabel={isCompleted ? `Undo ${habit.title}` : `Complete ${habit.title}`}
        accessibilityRole="button"
        activeOpacity={0.78}
        onPress={isCompleted ? onUndoComplete : onComplete}
        style={[styles.actionButton, isCompleted ? styles.undoButton : { backgroundColor: tone.foreground }]}
      >
        <Text style={[styles.actionText, isCompleted && styles.undoText]}>
          {isCompleted ? "Undo" : "Complete"}
        </Text>
      </TouchableOpacity>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderLeftWidth: 4,
    flexBasis: "48%",
    flexDirection: "row",
    flexWrap: "wrap",
    flexGrow: 1,
    gap: SPACING.md,
    minWidth: SPACING.cardMinWidth,
    padding: SPACING.md,
  },
  completedCard: {
    borderColor: COLORS.schedulePink,
    borderWidth: 1,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.sm,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.sm,
  },
  content: {
    flex: 1,
    minWidth: 92,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  streak: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  completedAt: {
    color: COLORS.schedulePinkDark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.xs,
  },
  checkChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  checkText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    flexBasis: "100%",
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: SPACING.md,
  },
  actionText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  undoButton: {
    backgroundColor: COLORS.surfaceMuted,
  },
  undoText: {
    color: COLORS.textMuted,
  },
});
