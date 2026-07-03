import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getToneColors, type ToneColors } from "../../utils/tone";
import type { IconName, Tone } from "../../types";

type ActionCardProps = {
  title: string;
  iconName: IconName;
  tone: Tone;
  onPress?: () => void;
  toneColorsOverride?: ToneColors;
};

export default function ActionCard({
  title,
  iconName,
  tone,
  onPress,
  toneColorsOverride,
}: ActionCardProps) {
  const toneColors = toneColorsOverride ?? getToneColors(tone);

  return (
    <TouchableOpacity
      accessibilityLabel={title}
      accessibilityRole="button"
      activeOpacity={onPress ? 0.84 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={styles.touchable}
    >
      <CustomCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: toneColors.background }]}>
          <Ionicons color={toneColors.foreground} name={iconName} size={22} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </CustomCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: SPACING.actionCardMinWidth,
  },
  card: {
    alignItems: "center",
    minHeight: SPACING.bottomNavOffset,
    padding: SPACING.md,
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
    marginTop: SPACING.md,
    textAlign: "center",
  },
});
