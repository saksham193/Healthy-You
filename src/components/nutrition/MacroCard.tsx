import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getNutritionMacroToneColors } from "../../utils/tone";
import type { MacroNutrient } from "../../types";

type MacroCardProps = {
  macro: MacroNutrient;
};

export default function MacroCard({ macro }: MacroCardProps) {
  const tone = getNutritionMacroToneColors(macro.id, macro.tone);

  return (
    <CustomCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
          <Ionicons color={tone.foreground} name={macro.iconName} size={20} />
        </View>
        <Text style={styles.percent}>{macro.percent}%</Text>
      </View>

      <Text style={styles.title}>{macro.name}</Text>
      <Text style={styles.value}>
        {macro.consumed}
        {macro.unit} / {macro.goal}
        {macro.unit}
      </Text>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: tone.foreground,
              width: `${macro.percent}%`,
            },
          ]}
        />
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: SPACING.cardMinWidth,
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
    height: SPACING.xxxl + SPACING.sm,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.sm,
  },
  percent: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.md,
  },
  value: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  track: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.sm,
    height: SPACING.sm,
    marginTop: SPACING.md,
    overflow: "hidden",
  },
  fill: {
    borderRadius: SPACING.sm,
    height: "100%",
  },
});
