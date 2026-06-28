import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getToneColors } from "../../utils/tone";
import type { HomeFeature } from "../../types";

type FeatureGridCardProps = {
  feature: HomeFeature;
  onPress?: () => void;
};

export default function FeatureGridCard({ feature, onPress }: FeatureGridCardProps) {
  const tone = getToneColors(feature.tone);

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.touchable}>
      <CustomCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
          <Ionicons color={tone.foreground} name={feature.iconName} size={25} />
        </View>
        <Text style={styles.title}>{feature.title}</Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          {feature.subtitle}
        </Text>
      </CustomCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 148,
  },
  card: {
    minHeight: 138,
    padding: SPACING.lg,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    marginBottom: SPACING.md,
    width: 48,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 17,
    marginTop: SPACING.xs,
  },
});
