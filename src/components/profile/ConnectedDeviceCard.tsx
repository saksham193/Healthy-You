import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { ConnectedDevice } from "../../types";

type ConnectedDeviceCardProps = {
  device: ConnectedDevice;
  onPress?: () => void;
  sourceLabel?: string;
  syncing?: boolean;
};

export default function ConnectedDeviceCard({
  device,
  onPress,
  sourceLabel,
  syncing = false,
}: ConnectedDeviceCardProps) {
  const isConnected = device.status === "Connected";
  const statusText = syncing ? "Syncing" : sourceLabel ?? device.status;

  return (
    <TouchableOpacity
      accessibilityLabel={`${device.name} device sync`}
      accessibilityRole="button"
      accessibilityState={{ busy: syncing, disabled: syncing || !onPress }}
      activeOpacity={onPress ? 0.86 : 1}
      disabled={syncing || !onPress}
      onPress={onPress}
    >
      <CustomCard style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons color={COLORS.primary} name={device.iconName} size={22} />
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{device.name}</Text>
          <Text style={styles.detail}>{device.detail}</Text>
        </View>
        <View
          style={[
            styles.statusChip,
            { backgroundColor: isConnected ? COLORS.accentLight : COLORS.surfaceMuted },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? COLORS.accent : COLORS.textMuted },
            ]}
          />
          <Text style={[styles.statusText, { color: isConnected ? COLORS.accent : COLORS.textMuted }]}>
            {statusText}
          </Text>
        </View>
      </CustomCard>
    </TouchableOpacity>
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.md,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.md,
  },
  content: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  name: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  detail: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  statusChip: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  statusDot: {
    borderRadius: SPACING.xs,
    height: SPACING.sm,
    width: SPACING.sm,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
