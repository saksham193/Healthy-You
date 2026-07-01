import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { useDevices } from "../../hooks/useDevices";

const formatSyncTime = (lastSyncedAt: string | null): string => {
  if (!lastSyncedAt) return "Not synced";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(lastSyncedAt));
};

export default function WatchSyncCard() {
  const {
    data: devices,
    handleDevicePress,
    syncStatusLabel,
    syncTitle,
    syncStatus,
  } = useDevices();
  const connectedDevices = devices.filter((device) => device.status === "Connected");
  const primaryDevice = connectedDevices[0] ?? devices[0];
  const isConnected = connectedDevices.length > 0;
  const isSyncing = syncStatus === "syncing";

  return (
    <TouchableOpacity
      accessibilityLabel="Device sync status"
      accessibilityRole="button"
      accessibilityState={{ busy: isSyncing, disabled: isSyncing }}
      activeOpacity={0.88}
      disabled={isSyncing}
      onPress={() => void handleDevicePress()}
      style={styles.card}
    >
      <View
        style={[
          styles.statusDot,
          { backgroundColor: isConnected ? COLORS.success : COLORS.textMuted },
        ]}
      />
      <View style={styles.content}>
        <Text style={styles.title}>
          {isConnected ? "Device Sync Active" : "Device Sync Inactive"}
        </Text>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Ionicons color={COLORS.danger} name={primaryDevice?.iconName ?? "watch-outline"} size={19} />
            <Text style={styles.metricText}>{syncStatusLabel}</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons color={COLORS.danger} name="sync-outline" size={18} />
            <Text style={styles.metricText}>{isSyncing ? "Syncing..." : `${syncTitle} - ${formatSyncTime(primaryDevice?.lastSyncedAt ?? null)}`}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: COLORS.purpleInk,
    borderRadius: 18,
    flexDirection: "row",
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  statusDot: {
    backgroundColor: COLORS.success,
    borderRadius: 14,
    height: 28,
    marginRight: SPACING.md,
    width: 28,
  },
  content: {
    flex: 1,
  },
  title: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xl,
    marginTop: SPACING.sm,
  },
  metric: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.xs,
  },
  metricText: {
    color: COLORS.white,
    flexShrink: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
