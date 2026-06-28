import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getToneColors } from "../../utils/tone";
import type { TimelineEvent, TimelineStatus, Tone } from "../../types";

type TimelineEventCardProps = {
  event: TimelineEvent;
  isLast?: boolean;
};

const statusTone: Record<TimelineStatus, Tone> = {
  completed: "accent",
  upcoming: "primary",
  missed: "danger",
};

const statusLabel: Record<TimelineStatus, string> = {
  completed: "Done",
  upcoming: "Upcoming",
  missed: "Missed",
};

export default function TimelineEventCard({ event, isLast = false }: TimelineEventCardProps) {
  const tone = getToneColors(statusTone[event.status]);

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={styles.time}>{event.time}</Text>
      </View>
      <View style={styles.markerColumn}>
        <View style={[styles.marker, { backgroundColor: tone.foreground }]} />
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <CustomCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
          <Ionicons color={tone.foreground} name={event.iconName} size={20} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={[styles.status, { backgroundColor: tone.background }]}>
              <Text style={[styles.statusText, { color: tone.foreground }]}>
                {statusLabel[event.status]}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{event.subtitle}</Text>
        </View>
      </CustomCard>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  timeColumn: {
    flexBasis: 72,
    paddingTop: SPACING.lg,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  markerColumn: {
    alignItems: "center",
    marginRight: SPACING.md,
    paddingTop: SPACING.lg,
  },
  marker: {
    borderColor: COLORS.white,
    borderRadius: SPACING.sm,
    borderWidth: 2,
    height: SPACING.lg,
    width: SPACING.lg,
  },
  line: {
    backgroundColor: COLORS.border,
    flex: 1,
    marginTop: SPACING.xs,
    minHeight: SPACING.xxl,
    width: 2,
  },
  card: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
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
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  title: {
    color: COLORS.black,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
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
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
});
