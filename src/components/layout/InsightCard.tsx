import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getToneColors } from "../../utils/tone";
import type { IconName, Tone } from "../../types";

type InsightCardProps = {
  title: string;
  status: string;
  detail: string;
  iconName: IconName;
  tone: Tone;
};

export default function InsightCard({ title, status, detail, iconName, tone }: InsightCardProps) {
  const toneColors = getToneColors(tone);

  return (
    <CustomCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: toneColors.background }]}>
        <Ionicons color={toneColors.foreground} name={iconName} size={22} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.chip, { backgroundColor: toneColors.background }]}>
            <Text style={[styles.chipText, { color: toneColors.foreground }]}>{status}</Text>
          </View>
        </View>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
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
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  title: {
    color: COLORS.black,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  chip: {
    borderRadius: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  detail: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.sm,
  },
});
