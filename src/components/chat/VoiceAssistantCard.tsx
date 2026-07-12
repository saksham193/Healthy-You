import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type VoiceAssistantCardProps = {
  onNotify?: () => void;
};

export default function VoiceAssistantCard({ onNotify }: VoiceAssistantCardProps) {
  return (
    <CustomCard style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons color={COLORS.primary} name="mic-outline" size={24} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Voice Assistant</Text>
        <Text style={styles.description}>
          Voice input is not available in this build. No audio is recorded, uploaded, or transcribed.
        </Text>
      </View>
      <TouchableOpacity
        accessibilityLabel="Learn about voice mode"
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onNotify}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Learn More</Text>
      </TouchableOpacity>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.xl,
    height: SPACING.xxxl + SPACING.xxl,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.xxl,
  },
  content: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
