import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import DashboardSection from "../layout/DashboardSection";
import { COLORS, NUTRITION_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { IconName, Tone } from "../../types";

type FoodEducationItem = {
  id: string;
  name: string;
  benefit: string;
  iconName: IconName;
  tone: Tone;
  benefits: string[];
  highlights: string[];
  recipes: string[];
};

const foods: FoodEducationItem[] = [
  {
    id: "avocado",
    name: "Avocado",
    benefit: "Heart-friendly fats for steady energy.",
    iconName: "nutrition-outline",
    tone: "accent",
    benefits: ["Supports fullness", "Adds potassium", "Pairs well with protein"],
    highlights: ["Healthy monounsaturated fats", "Fiber", "Vitamin E"],
    recipes: ["Avocado toast", "Green smoothie bowl", "Avocado chickpea salad"],
  },
  {
    id: "quinoa",
    name: "Quinoa",
    benefit: "Balanced grain with complete protein.",
    iconName: "ellipse-outline",
    tone: "warning",
    benefits: ["Steady carbs", "Good plant protein", "Gluten-free base"],
    highlights: ["Protein", "Magnesium", "Complex carbohydrates"],
    recipes: ["Quinoa khichdi", "Quinoa veggie bowl", "Quinoa breakfast porridge"],
  },
  {
    id: "turmeric",
    name: "Turmeric",
    benefit: "Warming spice for everyday meals.",
    iconName: "sparkles-outline",
    tone: "primary",
    benefits: ["Adds color and flavor", "Complements lentils", "Works in warm drinks"],
    highlights: ["Curcumin", "Manganese", "Iron"],
    recipes: ["Golden milk", "Turmeric dal", "Vegetable kitchari"],
  },
  {
    id: "spinach",
    name: "Spinach",
    benefit: "Leafy greens for micronutrient density.",
    iconName: "leaf-outline",
    tone: "accent",
    benefits: ["Easy iron boost", "Supports fiber intake", "Cooks quickly"],
    highlights: ["Iron", "Folate", "Vitamin K"],
    recipes: ["Spinach dal", "Paneer spinach bowl", "Green omelette"],
  },
  {
    id: "almonds",
    name: "Almonds",
    benefit: "Crunchy snack with healthy fats.",
    iconName: "cafe-outline",
    tone: "warning",
    benefits: ["Portable snack", "Supports satiety", "Pairs with fruit"],
    highlights: ["Vitamin E", "Magnesium", "Protein"],
    recipes: ["Almond oats", "Trail mix", "Almond date bites"],
  },
];

const toneColor = (tone: Tone): string => {
  switch (tone) {
    case "accent":
      return COLORS.accent;
    case "warning":
      return COLORS.warning;
    case "danger":
      return COLORS.danger;
    case "primary":
    default:
      return NUTRITION_COLORS.secondary;
  }
};

export default function FoodEducationSection() {
  const [selectedFood, setSelectedFood] = useState<FoodEducationItem | null>(null);

  return (
    <View>
      <DashboardSection title="Clickable Food Icons" actionLabel="See All" />
      <ScrollView
        contentContainerStyle={styles.foodRail}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {foods.map((food) => {
          const color = toneColor(food.tone);

          return (
            <TouchableOpacity
              activeOpacity={0.82}
              key={food.id}
              onPress={() => setSelectedFood(food)}
              style={styles.foodCard}
            >
              <View style={[styles.foodImage, { backgroundColor: `${color}22` }]}>
                <Ionicons color={color} name={food.iconName} size={28} />
                <View style={styles.playBadge}>
                  <Ionicons color={COLORS.white} name="play" size={12} />
                </View>
              </View>
              <Text numberOfLines={1} style={styles.foodName}>{food.name}</Text>
              <Text numberOfLines={2} style={styles.foodBenefit}>{food.benefit}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedFood(null)}
        transparent
        visible={Boolean(selectedFood)}
      >
        <View style={styles.modalBackdrop}>
          <CustomCard style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{selectedFood?.name}</Text>
                <Text style={styles.sheetSubtitle}>Food education</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.72}
                onPress={() => setSelectedFood(null)}
                style={styles.closeButton}
              >
                <Ionicons color={COLORS.text} name="close" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.detailHeading}>Benefits</Text>
            {selectedFood?.benefits.map((benefit) => (
              <Text key={benefit} style={styles.detailLine}>- {benefit}</Text>
            ))}

            <Text style={styles.detailHeading}>Nutrition Highlights</Text>
            <View style={styles.chipRow}>
              {selectedFood?.highlights.map((highlight) => (
                <View key={highlight} style={styles.highlightChip}>
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.detailHeading}>Example Recipes</Text>
            {selectedFood?.recipes.map((recipe) => (
              <Text key={recipe} style={styles.detailLine}>- {recipe}</Text>
            ))}
          </CustomCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  foodRail: {
    gap: SPACING.md,
    paddingRight: SPACING.screen,
  },
  foodCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: SPACING.sm,
    width: 128,
  },
  foodImage: {
    alignItems: "center",
    borderRadius: 14,
    height: 76,
    justifyContent: "center",
    overflow: "hidden",
  },
  playBadge: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    bottom: SPACING.sm,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: SPACING.sm,
    width: 24,
  },
  foodName: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.sm,
  },
  foodBenefit: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  modalBackdrop: {
    backgroundColor: "rgba(20, 13, 53, 0.32)",
    flex: 1,
    justifyContent: "flex-end",
    padding: SPACING.lg,
  },
  detailSheet: {
    maxHeight: "78%",
    padding: SPACING.lg,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  sheetSubtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  detailHeading: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.lg,
  },
  detailLine: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.md,
    marginTop: SPACING.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  highlightChip: {
    backgroundColor: NUTRITION_COLORS.light,
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  highlightText: {
    color: NUTRITION_COLORS.dark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
