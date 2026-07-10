import React from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS, SCHEDULE_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { CustomHealthRoutine } from "../../types";

type CustomRoutineCardProps = {
  routine: CustomHealthRoutine;
  busy?: boolean;
  reminderEnabled?: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onToggleReminder: (enabled: boolean) => void;
};

export default function CustomRoutineCard({
  routine,
  busy = false,
  reminderEnabled = routine.reminderEnabled,
  onDelete,
  onEdit,
  onToggleReminder,
}: CustomRoutineCardProps) {
  const isMedication = routine.type === "medication";

  return (
    <CustomCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={styles.iconWrap}>
            <Ionicons
              color={SCHEDULE_COLORS.dark}
              name={isMedication ? "medkit-outline" : "repeat-outline"}
              size={20}
            />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.typeLabel}>{isMedication ? "Medication routine" : "Habit routine"}</Text>
            <Text style={styles.title}>{routine.name}</Text>
          </View>
        </View>
        <View style={styles.iconActions}>
          <TouchableOpacity
            accessibilityLabel={`Edit ${routine.name}`}
            accessibilityRole="button"
            activeOpacity={0.74}
            disabled={busy}
            onPress={onEdit}
            style={styles.iconButton}
          >
            <Ionicons color={COLORS.text} name="create-outline" size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={`Delete ${routine.name}`}
            accessibilityRole="button"
            activeOpacity={0.74}
            disabled={busy}
            onPress={onDelete}
            style={[styles.iconButton, styles.deleteButton]}
          >
            <Ionicons color={COLORS.danger} name="trash-outline" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {routine.doseLabel ? <Text style={styles.detail}>{routine.doseLabel}</Text> : null}
      {routine.notes ? <Text style={styles.detail}>{routine.notes}</Text> : null}

      <TouchableOpacity
        accessibilityLabel={`${routine.name} reminder`}
        accessibilityRole="switch"
        accessibilityState={{ checked: reminderEnabled, disabled: busy }}
        activeOpacity={0.76}
        disabled={busy}
        onPress={() => onToggleReminder(!reminderEnabled)}
        style={styles.reminderRow}
      >
        <View style={styles.reminderCopy}>
          <Text style={styles.reminderTitle}>Reminder</Text>
          <Text style={styles.reminderDetail}>
            {reminderEnabled && routine.reminderTime
              ? `Daily at ${routine.reminderTime}`
              : busy ? "Updating..." : "Off"}
          </Text>
        </View>
        <Switch
          disabled={busy}
          ios_backgroundColor={COLORS.border}
          pointerEvents="none"
          thumbColor={COLORS.white}
          trackColor={{ false: COLORS.border, true: SCHEDULE_COLORS.dark }}
          value={reminderEnabled}
        />
      </TouchableOpacity>
      <Text style={styles.privacyText}>Notification text stays private and does not include routine details.</Text>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  identity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: SPACING.md,
    minWidth: 0,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: SCHEDULE_COLORS.light,
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  typeLabel: {
    color: SCHEDULE_COLORS.dark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  iconActions: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  deleteButton: {
    backgroundColor: COLORS.dangerLight,
  },
  detail: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
  },
  reminderRow: {
    alignItems: "center",
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: SPACING.md,
  },
  reminderCopy: {
    flex: 1,
    minWidth: 0,
  },
  reminderTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  reminderDetail: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  privacyText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
  },
});
