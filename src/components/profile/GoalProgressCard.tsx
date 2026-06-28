import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getToneColors } from "../../utils/tone";
import type { HealthGoal } from "../../types";

type GoalProgressCardProps = {
  goal: HealthGoal;
};

export default function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const tone = getToneColors(goal.tone);
  const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));

  return (
    <CustomCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
          <Ionicons color={tone.foreground} name={goal.iconName} size={20} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.value}>
            {goal.current} / {goal.target} {goal.unit}
          </Text>
        </View>
        <Text style={[styles.percent, { color: tone.foreground }]}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: tone.foreground,
              width: `${percent}%`,
            },
          ]}
        />
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.sm,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.sm,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  value: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  percent: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  track: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.lg,
    height: SPACING.sm,
    overflow: "hidden",
  },
  fill: {
    borderRadius: SPACING.lg,
    height: "100%",
  },
});
