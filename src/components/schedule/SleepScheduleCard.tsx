import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import ProgressRing from "../layout/ProgressRing";
import { COLORS, SCHEDULE_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { SleepSchedule } from "../../types";

type SleepScheduleCardProps = {
  schedule: SleepSchedule;
};

export default function SleepScheduleCard({ schedule }: SleepScheduleCardProps) {
  return (
    <CustomCard style={styles.card}>
      <View style={styles.routine}>
        <View style={styles.timeBlock}>
          <View style={styles.iconWrap}>
            <Ionicons color={SCHEDULE_COLORS.dark} name="moon-outline" size={22} />
          </View>
          <Text style={styles.label}>Bedtime</Text>
          <Text style={styles.time}>{schedule.bedtime}</Text>
        </View>
        <View style={styles.timeBlock}>
          <View style={styles.iconWrap}>
            <Ionicons color={COLORS.warning} name="sunny-outline" size={22} />
          </View>
          <Text style={styles.label}>Wake-up</Text>
          <Text style={styles.time}>{schedule.wakeTime}</Text>
        </View>
      </View>
      <View style={styles.progress}>
        <ProgressRing
          backgroundColor={SCHEDULE_COLORS.light}
          color={SCHEDULE_COLORS.dark}
          max={100}
          size={82}
          value={schedule.progressPercent}
        />
        <View style={styles.progressCopy}>
          <Text style={styles.progressTitle}>Sleep goal progress</Text>
          <Text style={styles.progressText}>
            {schedule.plannedHours}h planned of {schedule.goalHours}h goal
          </Text>
        </View>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  routine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  timeBlock: {
    backgroundColor: SCHEDULE_COLORS.light,
    borderRadius: SPACING.lg,
    flex: 1,
    minWidth: SPACING.cardMinWidth,
    padding: SPACING.md,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.sm,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.sm,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.md,
  },
  time: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  progress: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
  },
  progressCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  progressTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
});
