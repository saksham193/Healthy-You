import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type EmptyStateProps = {
  icon: IconName;
  title: string;
  subtitle: string;
  loading?: boolean;
  accentColor?: string;
  backgroundColor?: string;
};

export default function EmptyState({
  icon,
  title,
  subtitle,
  loading = false,
  accentColor = COLORS.primary,
  backgroundColor = COLORS.primaryLight,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor }]}>
        {loading ? (
          <ActivityIndicator color={accentColor} size="small" />
        ) : (
          <Ionicons color={accentColor} name={icon} size={26} />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: SPACING.xxl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
});
