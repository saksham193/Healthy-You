import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getNutritionMealToneColors } from "../../utils/tone";
import type { NutritionMeal } from "../../types";

type NutritionMealCardProps = {
  meal: NutritionMeal;
};

export default function NutritionMealCard({ meal }: NutritionMealCardProps) {
  const tone = getNutritionMealToneColors(meal.id, meal.name);

  return (
    <CustomCard style={[styles.card, { borderLeftColor: tone.foreground }]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons color={tone.foreground} name={meal.iconName} size={22} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{meal.name}</Text>
        <Text numberOfLines={2} style={styles.detail}>
          {meal.detail}
        </Text>
      </View>
      <View style={[styles.calorieChip, { backgroundColor: tone.background }]}>
        <Text style={[styles.calories, { color: tone.foreground }]}>{meal.calories} kcal</Text>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderLeftWidth: 4,
    flexDirection: "row",
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
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  detail: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  calorieChip: {
    borderRadius: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  calories: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
