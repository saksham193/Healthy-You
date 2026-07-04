import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getToneColors } from "../../utils/tone";
import type { MedibotAction } from "../../types";

type QuickActionChipProps = {
  action: MedibotAction;
  onPress?: (title: string) => void;
};

export default function QuickActionChip({ action, onPress }: QuickActionChipProps) {
  const tone = getToneColors(action.tone);

  return (
    <TouchableOpacity
      accessibilityLabel={action.title}
      accessibilityRole="button"
      activeOpacity={0.84}
      onPress={() => onPress?.(action.title)}
    >
      <CustomCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
          <Ionicons color={tone.foreground} name={action.iconName} size={22} />
        </View>
        <Text numberOfLines={2} style={styles.title}>{action.title}</Text>
      </CustomCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    minHeight: 112,
    padding: SPACING.md,
    width: 132,
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
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.md,
    textAlign: "center",
  },
});
