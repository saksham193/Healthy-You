import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { useDevices } from "../../hooks/useDevices";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { ConnectedHealthDevice } from "../../types";

type WatchSyncStatusCardProps = {
  activityPercent: number;
  heartRate?: string;
};

const fallbackDevice: ConnectedHealthDevice = {
  id: "mock-health",
  name: "Demo Health",
  detail: "Mock sync data",
  status: "Connected",
  iconName: "pulse-outline",
  provider: "Mock Health",
  lastSyncedAt: new Date().toISOString(),
  syncStatus: "synced",
};

export default function WatchSyncStatusCard({
  activityPercent,
  heartRate = "82 bpm",
}: WatchSyncStatusCardProps) {
  const {
    data: devices,
    handleDevicePress,
    syncStatusLabel,
    syncTitle,
    syncStatus,
  } = useDevices();
  const activeDevice = useMemo(
    () => devices.find((device) => device.status === "Connected") ?? devices[0] ?? fallbackDevice,
    [devices],
  );
  const isSyncing = syncStatus === "syncing";

  return (
    <TouchableOpacity
      accessibilityLabel="Device sync status"
      accessibilityRole="button"
      accessibilityState={{ busy: isSyncing, disabled: isSyncing }}
      activeOpacity={0.86}
      disabled={isSyncing}
      onPress={() => void handleDevicePress()}
    >
      <CustomCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons color={COLORS.primary} name={activeDevice.iconName} size={22} />
          </View>
          <View>
            <Text style={styles.title}>Device Sync Active</Text>
            <Text style={styles.subtitle}>{activeDevice.provider}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{syncTitle}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Heart Rate</Text>
          <Text style={styles.metricValue}>{heartRate}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Activity %</Text>
          <Text style={styles.metricValue}>{activityPercent}%</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Sync Status</Text>
          <Text style={styles.metricValue}>{syncStatusLabel}</Text>
        </View>
      </View>
      </CustomCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.md,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.md,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  statusBadge: {
    alignItems: "center",
    backgroundColor: COLORS.accentLight,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  statusDot: {
    backgroundColor: COLORS.accent,
    borderRadius: SPACING.xs,
    height: SPACING.sm,
    width: SPACING.sm,
  },
  statusText: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  metric: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.lg,
    flex: 1,
    minWidth: SPACING.actionCardMinWidth,
    padding: SPACING.md,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  metricValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
});
