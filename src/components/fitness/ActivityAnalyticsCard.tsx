import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import ProgressRing from "../layout/ProgressRing";
import { COLORS, FITNESS_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { FitnessSummary } from "../../types";

type ActivityAnalyticsCardProps = {
  summary: FitnessSummary;
};

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

export default function ActivityAnalyticsCard({ summary }: ActivityAnalyticsCardProps) {
  const activeMinutesPercent = Math.round((summary.weeklyActivityMinutes / 450) * 100);

  return (
    <CustomCard style={styles.card}>
      <View style={styles.analyticsCard}>
        <ProgressRing
          backgroundColor={FITNESS_COLORS.light}
          color={FITNESS_COLORS.primary}
          max={100}
          size={72}
          value={clampPercent(summary.stepProgress)}
        />
        <Text numberOfLines={2} style={styles.metricTitle}>Steps Ring</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.metricValue}>
          {summary.steps.toLocaleString("en-US")}
        </Text>
      </View>
      <View style={styles.analyticsCard}>
        <View style={styles.metricIcon}>
          <Ionicons color={COLORS.warning} name="flame-outline" size={24} />
        </View>
        <Text numberOfLines={2} style={styles.metricTitle}>Calories Burned</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.metricValue}>
          {summary.caloriesBurned} kcal
        </Text>
      </View>
      <View style={styles.analyticsCard}>
        <ProgressRing
          backgroundColor={FITNESS_COLORS.light}
          color={FITNESS_COLORS.primary}
          max={100}
          size={72}
          value={clampPercent(activeMinutesPercent)}
        />
        <Text numberOfLines={2} style={styles.metricTitle}>Device Active Minutes</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.metricValue}>
          {summary.weeklyActivityMinutes} min
        </Text>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  analyticsCard: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.lg,
    flex: 1,
    minWidth: SPACING.cardMinWidth,
    padding: SPACING.md,
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: COLORS.warningLight,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  metricTitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  metricValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
});
