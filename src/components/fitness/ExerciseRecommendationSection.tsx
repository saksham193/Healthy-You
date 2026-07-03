import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import DashboardSection from "../layout/DashboardSection";
import { COLORS, FITNESS_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getFitnessToneColors } from "../../utils/tone";
import type { HealthGoal, IconName, ProfileData, Tone } from "../../types";

type ExerciseRecommendation = {
  id: string;
  title: string;
  description: string;
  iconName: IconName;
  tone: Tone;
};

type ExerciseRecommendationSectionProps = {
  goals?: HealthGoal[];
  profile?: ProfileData | null;
  trends?: unknown[];
};

const fallbackRecommendations: ExerciseRecommendation[] = [
  {
    id: "gentle-yoga",
    title: "Gentle Yoga",
    description: "A low-stress flow for mobility and recovery.",
    iconName: "leaf-outline",
    tone: "accent",
  },
  {
    id: "low-impact-cardio",
    title: "Low Impact Cardio",
    description: "Heart-rate friendly movement without joint strain.",
    iconName: "heart-outline",
    tone: "danger",
  },
  {
    id: "mobility",
    title: "Mobility",
    description: "Short range-of-motion work for better movement.",
    iconName: "accessibility-outline",
    tone: "warning",
  },
  {
    id: "walking",
    title: "Walking",
    description: "A steady walk to support steps and active minutes.",
    iconName: "walk-outline",
    tone: "primary",
  },
];

const prioritizeRecommendations = (
  recommendations: ExerciseRecommendation[],
  goals?: HealthGoal[],
  profile?: ProfileData | null,
  trends?: unknown[],
): ExerciseRecommendation[] => {
  const hasStepGoal = goals?.some((goal) => goal.id.includes("steps")) ?? false;
  const hasWorkoutGoal = goals?.some((goal) => goal.id.includes("workout")) ?? false;
  const hasTrendContext = Boolean(trends?.length);
  const healthStatus = profile?.summary.healthStatus;
  const priorityIds = [
    hasStepGoal ? "walking" : null,
    hasWorkoutGoal ? "low-impact-cardio" : null,
    hasTrendContext ? "mobility" : null,
    healthStatus === "Excellent" ? "mobility" : "gentle-yoga",
  ].filter((id): id is string => Boolean(id));

  return [...recommendations].sort((left, right) => {
    const leftIndex = priorityIds.indexOf(left.id);
    const rightIndex = priorityIds.indexOf(right.id);

    if (leftIndex === -1 && rightIndex === -1) {
      return 0;
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
};

export default function ExerciseRecommendationSection({
  goals,
  profile,
  trends,
}: ExerciseRecommendationSectionProps) {
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<ExerciseRecommendation | null>(null);
  const recommendations = useMemo(
    () => prioritizeRecommendations(fallbackRecommendations, goals, profile, trends),
    [goals, profile, trends],
  );

  return (
    <View>
      <DashboardSection title="Recommended Exercises" actionLabel="For You" />
      <ScrollView
        contentContainerStyle={styles.rail}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {recommendations.map((recommendation) => {
          const tone = getFitnessToneColors(recommendation.tone);

          return (
            <TouchableOpacity
              activeOpacity={0.84}
              key={recommendation.id}
              onPress={() => setSelectedRecommendation(recommendation)}
              style={styles.recommendationCard}
            >
              <View style={[styles.thumbnail, { backgroundColor: tone.background }]}>
                <Ionicons color={tone.foreground} name={recommendation.iconName} size={32} />
                <View style={styles.playButton}>
                  <Ionicons color={COLORS.white} name="play" size={12} />
                </View>
              </View>
              <Text numberOfLines={1} style={styles.cardTitle}>{recommendation.title}</Text>
              <Text numberOfLines={2} style={styles.cardDescription}>
                {recommendation.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedRecommendation(null)}
        transparent
        visible={Boolean(selectedRecommendation)}
      >
        <View style={styles.modalBackdrop}>
          <CustomCard style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{selectedRecommendation?.title}</Text>
                <Text style={styles.sheetSubtitle}>Recommended exercise</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.72}
                onPress={() => setSelectedRecommendation(null)}
                style={styles.closeButton}
              >
                <Ionicons color={COLORS.text} name="close" size={20} />
              </TouchableOpacity>
            </View>
            <Text style={styles.detailText}>{selectedRecommendation?.description}</Text>
            <View style={styles.inlineCta}>
              <Ionicons color={FITNESS_COLORS.primary} name="play-circle-outline" size={20} />
              <Text style={styles.inlineCtaText}>Preview workout</Text>
            </View>
          </CustomCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    gap: SPACING.md,
    paddingRight: SPACING.screen,
  },
  recommendationCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: SPACING.sm,
    width: 148,
  },
  thumbnail: {
    alignItems: "center",
    borderRadius: 14,
    height: 86,
    justifyContent: "center",
    overflow: "hidden",
  },
  playButton: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.primary,
    borderRadius: 12,
    bottom: SPACING.sm,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: SPACING.sm,
    width: 24,
  },
  cardTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.sm,
  },
  cardDescription: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  modalBackdrop: {
    backgroundColor: "rgba(76, 29, 149, 0.28)",
    flex: 1,
    justifyContent: "flex-end",
    padding: SPACING.lg,
  },
  detailSheet: {
    gap: SPACING.lg,
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
  detailText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  inlineCta: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  inlineCtaText: {
    color: FITNESS_COLORS.dark,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
