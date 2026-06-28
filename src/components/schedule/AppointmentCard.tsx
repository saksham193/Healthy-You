import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { Appointment } from "../../types";

type AppointmentCardProps = {
  appointment: Appointment;
};

export default function AppointmentCard({ appointment }: AppointmentCardProps) {
  return (
    <CustomCard style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons color={COLORS.primary} name={appointment.iconName} size={22} />
      </View>
      <View style={styles.content}>
        <Text style={styles.specialty}>{appointment.specialty}</Text>
        <Text style={styles.doctor}>{appointment.doctorName}</Text>
        <View style={styles.locationRow}>
          <Ionicons color={COLORS.textMuted} name="location-outline" size={14} />
          <Text style={styles.location}>{appointment.location}</Text>
        </View>
      </View>
      <View style={styles.dateBlock}>
        <Text style={styles.date}>{appointment.date}</Text>
        <Text style={styles.time}>{appointment.time}</Text>
      </View>
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.md,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.md,
  },
  content: {
    flex: 1,
  },
  specialty: {
    color: COLORS.primaryDark,
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
    gap: SPACING.xs,
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
