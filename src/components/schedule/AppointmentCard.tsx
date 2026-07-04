import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getScheduleAppointmentToneColors } from "../../utils/tone";
import type { Appointment } from "../../types";

type AppointmentCardProps = {
  appointment: Appointment;
};

export default function AppointmentCard({ appointment }: AppointmentCardProps) {
  const tone = getScheduleAppointmentToneColors(appointment.id, appointment.specialty);

  return (
    <CustomCard style={[styles.card, { borderLeftColor: tone.foreground }]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Ionicons color={tone.foreground} name={appointment.iconName} size={22} />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.specialty, { color: tone.foreground }]}>{appointment.specialty}</Text>
        <Text numberOfLines={1} style={styles.doctor}>{appointment.doctorName}</Text>
        <View style={styles.locationRow}>
          <Ionicons color={COLORS.textMuted} name="location-outline" size={14} />
          <Text numberOfLines={2} style={styles.location}>{appointment.location}</Text>
        </View>
      </View>
      <View style={[styles.dateBlock, { backgroundColor: tone.background }]}>
        <Text style={styles.date}>{appointment.date}</Text>
        <Text style={[styles.time, { color: tone.foreground }]}>{appointment.time}</Text>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderLeftWidth: 4,
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
    minWidth: SPACING.cardMinWidth,
  },
  specialty: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  doctor: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  location: {
    color: COLORS.textMuted,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  dateBlock: {
    alignItems: "flex-end",
    alignSelf: "flex-start",
    borderRadius: SPACING.lg,
    gap: SPACING.xs,
    minWidth: 88,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  date: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
