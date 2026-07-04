import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getScheduleToneColors } from "../../utils/tone";
import type { MedicationReminder, MedicationStatus, Tone } from "../../types";

type MedicationReminderCardProps = {
  medication: MedicationReminder;
};

const statusTone: Record<MedicationStatus, Tone> = {
  completed: "accent",
  pending: "warning",
};

export default function MedicationReminderCard({ medication }: MedicationReminderCardProps) {
  const tone = getScheduleToneColors(statusTone[medication.status]);
  const isCompleted = medication.status === "completed";

  return (
    <CustomCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons
          color={tone.foreground}
          name={isCompleted ? "checkmark-circle-outline" : "time-outline"}
          size={22}
        />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>{medication.name}</Text>
        <Text numberOfLines={1} style={styles.dosage}>{medication.dosage}</Text>
      </View>
      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.time}>{medication.time}</Text>
        <View style={[styles.status, { backgroundColor: tone.background }]}>
          <Text numberOfLines={1} style={[styles.statusText, { color: tone.foreground }]}>
            {isCompleted ? "Completed" : "Pending"}
          </Text>
        </View>
      </View>
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
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.md,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.md,
  },
  content: {
    flex: 1,
    minWidth: 132,
  },
  name: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  dosage: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  meta: {
    alignItems: "flex-end",
    alignSelf: "flex-start",
    gap: SPACING.sm,
  },
  time: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  status: {
    borderRadius: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
