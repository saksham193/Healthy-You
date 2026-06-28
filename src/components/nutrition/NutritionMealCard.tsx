import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { NutritionMeal } from "../../types";

type NutritionMealCardProps = {
  meal: NutritionMeal;
};

export default function NutritionMealCard({ meal }: NutritionMealCardProps) {
  return (
    <CustomCard style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons color={COLORS.primary} name={meal.iconName} size={22} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{meal.name}</Text>
        <Text numberOfLines={2} style={styles.detail}>
          {meal.detail}
        </Text>
      </View>
      <Text style={styles.calories}>{meal.calories} kcal</Text>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
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
  calories: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
