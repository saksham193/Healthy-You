import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getScheduleHabitToneColors } from "../../utils/tone";
import type { Habit } from "../../types";

type HabitTrackerCardProps = {
  habit: Habit;
};

export default function HabitTrackerCard({ habit }: HabitTrackerCardProps) {
  const tone = getScheduleHabitToneColors(habit.id, habit.title);

  return (
    <CustomCard style={[styles.card, { borderLeftColor: tone.foreground }]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons color={tone.foreground} name={habit.iconName} size={21} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{habit.title}</Text>
        <Text style={styles.streak}>{habit.streak}</Text>
      </View>
      <View style={[styles.checkChip, { backgroundColor: habit.completed ? tone.background : COLORS.surfaceMuted }]}>
        <Ionicons
          color={habit.completed ? tone.foreground : COLORS.textMuted}
          name={habit.completed ? "checkmark-circle" : "ellipse-outline"}
          size={14}
        />
        <Text style={[styles.checkText, { color: habit.completed ? tone.foreground : COLORS.textMuted }]}>
          {habit.completed ? "Done" : "Due"}
        </Text>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderLeftWidth: 4,
    flexBasis: "48%",
    flexDirection: "row",
    flexGrow: 1,
    gap: SPACING.md,
    minWidth: SPACING.cardMinWidth,
    padding: SPACING.md,
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
  checkChip: {
    alignItems: "center",
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
});
