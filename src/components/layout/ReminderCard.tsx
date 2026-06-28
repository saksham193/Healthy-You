import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type ReminderCardProps = {
  title: string;
  time: string;
  icon: IconName;
  status?: string;
  repeatLabel?: string;
};

export default function ReminderCard({ title, time, icon, status, repeatLabel }: ReminderCardProps) {
  return (
    <View style={styles.timeline}>
      <View style={styles.timeBlock}>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.dot} />
      <CustomCard style={styles.card}>
        <View style={styles.icon}>
          <Ionicons color={COLORS.primary} name={icon} size={24} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {status ? <Text style={styles.subtitle}>{status}</Text> : null}
          {repeatLabel ? <Text style={styles.repeat}>{repeatLabel}</Text> : null}
        </View>
        <Ionicons color={COLORS.primary} name="notifications-outline" size={20} />
      </CustomCard>
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: SPACING.lg,
  },
  timeBlock: {
    width: 54,
  },
  time: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  dot: {
    backgroundColor: COLORS.primary,
    borderRadius: 7,
    height: 14,
    marginRight: SPACING.md,
    width: 14,
  },
  card: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    padding: SPACING.md,
  },
  icon: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    marginRight: SPACING.md,
    width: 38,
  },
  content: {
    flex: 1,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  subtitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs / 2,
  },
  repeat: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs / 2,
  },
});
