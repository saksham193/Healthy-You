import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { ProfileSummary } from "../../types";

type ProfileHeaderCardProps = {
  profile: ProfileSummary;
  onEditPress?: () => void;
};

export default function ProfileHeaderCard({ profile, onEditPress }: ProfileHeaderCardProps) {
  return (
    <CustomCard style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons color={COLORS.primary} name="person" size={34} />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.name}>{profile.name}</Text>
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.meta}>{profile.age} Years</Text>
          <View style={styles.divider} />
          <Text numberOfLines={1} style={styles.meta}>{profile.gender}</Text>
          <View style={styles.divider} />
          <Text numberOfLines={1} style={styles.meta}>{profile.bloodGroup}</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityLabel="Edit profile"
        accessibilityRole="button"
        activeOpacity={0.84}
        onPress={onEditPress}
        style={styles.editButton}
      >
        <Ionicons color={COLORS.white} name="create-outline" size={18} />
        <Text style={styles.editText}>Edit Profile</Text>
      </TouchableOpacity>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.white,
    borderRadius: SPACING.xxxl,
    borderWidth: 3,
    height: SPACING.xxxl * 2,
    justifyContent: "center",
    width: SPACING.xxxl * 2,
    ...SHADOWS.soft,
  },
  content: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  name: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  divider: {
    backgroundColor: COLORS.border,
    borderRadius: SPACING.xs,
    height: SPACING.sm,
    width: SPACING.xs,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.xl,
    flexDirection: "row",
    gap: SPACING.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  editText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
