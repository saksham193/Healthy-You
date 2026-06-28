import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getToneColors } from "../../utils/tone";
import type { IconName, Tone } from "../../types";

type StatsCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: IconName;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  tone = "primary",
  style,
}: StatsCardProps) {
  const toneColors = getToneColors(tone);

  return (
    <CustomCard style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: toneColors.background }]}>
          <Ionicons color={toneColors.foreground} name={icon} size={22} />
        </View>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? (
        <Text numberOfLines={2} style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 132,
    padding: SPACING.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  title: {
    color: COLORS.text,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  value: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.md,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 17,
    marginTop: SPACING.xs,
  },
});
