import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getToneColors } from "../../utils/tone";
import type { ConversationHistory } from "../../types";

type ConversationHistoryCardProps = {
  item: ConversationHistory;
};

export default function ConversationHistoryCard({ item }: ConversationHistoryCardProps) {
  const tone = getToneColors(item.tone);

  return (
    <CustomCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons color={tone.foreground} name={item.iconName} size={20} />
      </View>
      <View style={styles.content}>
        <Text style={styles.group}>{item.group}</Text>
        <Text style={styles.title}>{item.title}</Text>
      </View>
      <Ionicons color={COLORS.textMuted} name="chevron-forward" size={18} />
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.sm,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.sm,
  },
  content: {
    flex: 1,
  },
  group: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
});
