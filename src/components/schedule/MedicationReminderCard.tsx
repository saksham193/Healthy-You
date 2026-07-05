import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getScheduleToneColors } from "../../utils/tone";
import type { MedicationLogStatus, MedicationReminder } from "../../types";

type MedicationReminderCardProps = {
  loggedAt?: string;
  localStatus?: MedicationLogStatus;
  medication: MedicationReminder;
  onClear?: () => void;
  onSkip?: () => void;
  onTaken?: () => void;
};

export default function MedicationReminderCard({
  localStatus,
  loggedAt,
  medication,
  onClear,
  onSkip,
  onTaken,
}: MedicationReminderCardProps) {
  const effectiveTone = localStatus === "taken"
    ? "accent"
    : localStatus === "skipped"
      ? "danger"
      : "warning";
  const tone = getScheduleToneColors(effectiveTone);
  const isTaken = localStatus === "taken";
  const isSkipped = localStatus === "skipped";
  const hasLocalStatus = Boolean(localStatus);

  return (
    <CustomCard style={[styles.card, hasLocalStatus && { borderColor: tone.foreground }]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons
          color={tone.foreground}
          name={isTaken ? "checkmark-circle-outline" : isSkipped ? "close-circle-outline" : "time-outline"}
          size={22}
        />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>{medication.name}</Text>
        <Text numberOfLines={1} style={styles.dosage}>{medication.dosage}</Text>
        {loggedAt ? <Text numberOfLines={1} style={styles.loggedAt}>{loggedAt}</Text> : null}
      </View>
      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.time}>{medication.time}</Text>
        <View style={[styles.status, { backgroundColor: tone.background }]}>
          <Text numberOfLines={1} style={[styles.statusText, { color: tone.foreground }]}>
            {isTaken ? "Taken" : isSkipped ? "Skipped" : "Pending"}
          </Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        {hasLocalStatus ? (
          <TouchableOpacity
            accessibilityLabel={`Clear ${medication.name} status`}
            accessibilityRole="button"
            activeOpacity={0.78}
            onPress={onClear}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              accessibilityLabel={`Mark ${medication.name} taken`}
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={onTaken}
              style={[styles.actionButton, { backgroundColor: getScheduleToneColors("accent").foreground }]}
            >
              <Ionicons color={COLORS.white} name="checkmark" size={15} />
              <Text style={styles.actionText}>Taken</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Mark ${medication.name} skipped`}
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={onSkip}
              style={[styles.actionButton, styles.skipButton]}
            >
              <Ionicons color={COLORS.danger} name="close" size={15} />
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderColor: "transparent",
    borderWidth: 1,
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
  loggedAt: {
    color: COLORS.schedulePinkDark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
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
  actionRow: {
    alignItems: "center",
    flexBasis: "100%",
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "flex-end",
  },
  actionButton: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    minHeight: 34,
    paddingHorizontal: SPACING.md,
  },
  actionText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.lg,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: SPACING.md,
  },
  clearText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  skipButton: {
    backgroundColor: COLORS.dangerLight,
  },
  skipText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
