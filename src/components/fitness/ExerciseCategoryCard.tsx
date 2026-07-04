import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getFitnessToneColors } from "../../utils/tone";
import type { ExerciseCategory } from "../../types";

type ExerciseCategoryCardProps = {
  category: ExerciseCategory;
  completedCount?: number;
  selected?: boolean;
  workoutCount?: number;
  onPress?: () => void;
};

export default function ExerciseCategoryCard({
  category,
  completedCount = 0,
  selected = false,
  workoutCount,
  onPress,
}: ExerciseCategoryCardProps) {
  const tone = getFitnessToneColors(category.tone);

  return (
    <TouchableOpacity
      accessibilityLabel={`${category.title}${selected ? ", selected" : ""}`}
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={styles.touchTarget}
    >
      <CustomCard style={[styles.card, selected && { borderColor: tone.foreground }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
            <Ionicons color={tone.foreground} name={category.iconName} size={22} />
          </View>
          {selected ? (
            <View style={[styles.selectedBadge, { backgroundColor: tone.background }]}>
              <Ionicons color={tone.foreground} name="checkmark" size={14} />
            </View>
          ) : null}
        </View>
        <Text numberOfLines={2} style={styles.title}>{category.title}</Text>
        <Text numberOfLines={3} style={styles.description}>{category.description}</Text>
        <Text numberOfLines={1} style={styles.meta}>
          {workoutCount ?? 0} workouts - {completedCount} done this week
        </Text>
      </CustomCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: SPACING.cardMinWidth,
  },
  card: {
    borderColor: "transparent",
    borderWidth: 1,
    minHeight: 184,
    padding: SPACING.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.md,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.md,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: TYPOGRAPHY.lineHeights.md,
    marginTop: SPACING.md,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.md,
  },
  selectedBadge: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
