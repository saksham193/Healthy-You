import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AchievementCard from "../../components/profile/AchievementCard";
import ConnectedDeviceCard from "../../components/profile/ConnectedDeviceCard";
import EmergencyContactCard from "../../components/profile/EmergencyContactCard";
import GoalProgressCard from "../../components/profile/GoalProgressCard";
import MedicalInfoCard from "../../components/profile/MedicalInfoCard";
import ProfileHeaderCard from "../../components/profile/ProfileHeaderCard";
import ActionCard from "../../components/layout/ActionCard";
import AppHeader from "../../components/layout/AppHeader";
import DashboardSection from "../../components/layout/DashboardSection";
import ProgressRing from "../../components/layout/ProgressRing";
import ReminderCard from "../../components/layout/ReminderCard";
import ScreenSheet from "../../components/layout/ScreenSheet";
import StatsCard from "../../components/layout/StatsCard";
import EmptyState from "../../components/layout/EmptyState";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import { useDevices } from "../../hooks/useDevices";
import { useHealthData } from "../../hooks/useHealthData";
import { useAuthStore } from "../../store/authStore";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

export default function ProfileScreen() {
  const authUser = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const { data, error, loading } = useHealthData();
  const devices = useDevices();
  const profile = data.profile;
  const healthScore = data.healthScore;
  const isDeviceSyncing = devices.syncStatus === "syncing";
  const profileSyncLabel = (() => {
    if (data.profileSyncStatus === "synced") return "Synced";
    if (data.profileSyncStatus === "pending") return "Sync pending";
    if (data.profileSyncStatus === "offline") return "Offline changes saved";
    if (data.profileSyncStatus === "failed") return "Sync failed";
    if (data.profileSyncStatus === "syncing") return "Syncing";

    return "Local profile";
  })();
  const healthBackupLabel = (() => {
    if (data.healthBackupStatus === "synced") return "Health backup: Synced";
    if (data.healthBackupStatus === "pending") return "Health backup: Pending";
    if (data.healthBackupStatus === "offline") return "Health backup: Offline saved";
    if (data.healthBackupStatus === "failed") return "Health backup: Sync failed";
    if (data.healthBackupStatus === "syncing") return "Health backup: Syncing";

    return data.latestHealthSummary?.displaySource ?? "Health backup: Local";
  })();

  if (!profile || !healthScore) {
    return (
      <ScreenContainer>
        <AppHeader title="Health Profile" subtitle="Your personal health identity center" />
        <ScreenSheet>
          <CustomCard style={styles.scoreCard}>
            <EmptyState
              icon={error ? "alert-circle-outline" : "person-outline"}
              subtitle={error ?? (loading ? "Loading your profile." : "Profile data is unavailable.")}
              title={error ? "Unable to load profile" : "Preparing profile"}
            />
          </CustomCard>
        </ScreenSheet>
      </ScreenContainer>
    );
  }

  const profileSummary = {
    ...profile.summary,
    healthScore: healthScore.score,
    healthStatus: healthScore.status,
    monthlyChange: healthScore.change,
  };
  const primaryEmergencyContact = profile.emergencyContacts[0];
  const handleProfileAction = (title: string) => {
    Alert.alert(title, "This profile action is ready for the next connected workflow.");
  };
  const handleEditProfile = () => {
    Alert.alert("Edit Profile", "Profile editing will open when account settings are connected.");
  };
  const handleLogout = () => {
    Alert.alert("Log out", "You will return to the sign-in screen. Local health and chat cache stays on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <AppHeader title="Health Profile" subtitle="Your personal health identity center">
        <ProfileHeaderCard onEditPress={handleEditProfile} profile={profileSummary} />
      </AppHeader>

      <ScreenSheet>
        <CustomCard style={styles.scoreCard}>
          <ProgressRing max={100} size={118} value={healthScore.score} />
          <View style={styles.scoreCopy}>
            <Text style={styles.scoreLabel}>Overall Health Score</Text>
            <Text style={styles.scoreValue}>{healthScore.score} / 100</Text>
            <View style={styles.scoreMeta}>
              <View style={styles.statusChip}>
                <Text style={styles.statusText}>{healthScore.status}</Text>
              </View>
              <Text style={styles.monthlyChange}>
                Compared to last month: {healthScore.change}
              </Text>
            </View>
          </View>
        </CustomCard>

        <DashboardSection title="Body Metrics" />
        <View style={styles.metricsGrid}>
          {profile.bodyMetrics.map((metric) => (
            <StatsCard
              icon={metric.iconName}
              key={metric.id}
              subtitle={metric.subtitle}
              title={metric.title}
              tone={metric.tone}
              value={metric.value}
              style={styles.metricCard}
            />
          ))}
        </View>

        <DashboardSection title="Vital Information" />
        <View style={styles.metricsGrid}>
          {profile.vitalMetrics.map((metric) => (
            <StatsCard
              icon={metric.iconName}
              key={metric.id}
              subtitle={metric.subtitle}
              title={metric.title}
              tone={metric.tone}
              value={metric.value}
              style={styles.metricCard}
            />
          ))}
        </View>

        <DashboardSection title="Health Goals" />
        <View style={styles.list}>
          {profile.healthGoals.map((goal) => (
            <GoalProgressCard goal={goal} key={goal.id} />
          ))}
        </View>

        <DashboardSection title="Medical Information" />
        <View style={styles.infoGrid}>
          {profile.medicalInfo.map((item) => (
            <MedicalInfoCard item={item} key={item.id} />
          ))}
        </View>

        <DashboardSection title="Connected Devices" />
        {devices.data.length > 0 ? (
          <View style={styles.list}>
            {devices.data.map((device) => (
              <ConnectedDeviceCard
                device={device}
                key={device.id}
                onPress={() => void devices.handleDevicePress()}
                sourceLabel={devices.syncStatusLabel}
                syncing={isDeviceSyncing}
              />
            ))}
          </View>
        ) : (
          <CustomCard style={styles.emptyCard}>
            <EmptyState
              icon={devices.error ? "alert-circle-outline" : "fitness-outline"}
              subtitle={
                devices.error ??
                (devices.loading
                  ? "Loading connected devices."
                  : "Connect Health Connect or a compatible health app to sync activity, sleep, and vitals.")
              }
              title={devices.error ? "Unable to load devices" : "No connected devices"}
            />
          </CustomCard>
        )}

        <DashboardSection title="Emergency Contacts" />
        {primaryEmergencyContact ? (
          <ReminderCard
            icon={primaryEmergencyContact.iconName}
            repeatLabel={primaryEmergencyContact.phoneNumber}
            status={primaryEmergencyContact.relationship}
            time="SOS"
            title={primaryEmergencyContact.name}
          />
        ) : null}
        <View style={[styles.list, styles.sectionGap]}>
          {profile.emergencyContacts.map((contact) => (
            <EmergencyContactCard contact={contact} key={contact.id} />
          ))}
        </View>

        <DashboardSection title="Health Achievements" />
        <View style={styles.infoGrid}>
          {profile.achievements.map((achievement) => (
            <AchievementCard achievement={achievement} key={achievement.id} />
          ))}
        </View>

        <DashboardSection title="Account" />
        <CustomCard style={styles.accountCard}>
          <View style={styles.accountCopy}>
            <Text style={styles.accountName}>{authUser?.name ?? profile.summary.name}</Text>
            <Text style={styles.accountEmail}>{authUser?.email ?? "Signed in on this device"}</Text>
            <Text style={styles.syncStatus}>
              {profileSyncLabel}
              {data.queuedProfileUpdateCount > 0 ? ` (${data.queuedProfileUpdateCount})` : ""}
            </Text>
            <Text style={styles.syncStatus}>
              {healthBackupLabel}
              {data.queuedHealthSummaryBackupCount > 0 ? ` (${data.queuedHealthSummaryBackupCount})` : ""}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isAuthLoading}
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              (pressed || isAuthLoading) && styles.logoutButtonPressed,
            ]}
          >
            <Text style={styles.logoutText}>{isAuthLoading ? "Signing out..." : "Log Out"}</Text>
          </Pressable>
        </CustomCard>

        <DashboardSection title="Quick Actions" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionRail}
        >
          {profile.actions.map((action) => (
            <View key={action.id} style={styles.actionItem}>
              <ActionCard
                iconName={action.iconName}
                onPress={() => handleProfileAction(action.title)}
                title={action.title}
                tone={action.tone}
              />
            </View>
          ))}
        </ScrollView>
      </ScreenSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  scoreCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scoreValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  scoreMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  statusChip: {
    backgroundColor: COLORS.accentLight,
    borderRadius: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  statusText: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  monthlyChange: {
    color: COLORS.textMuted,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    minWidth: SPACING.cardMinWidth,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  metricCard: {
    flexBasis: "48%",
    minWidth: SPACING.cardMinWidth,
  },
  list: {
    gap: SPACING.md,
  },
  emptyCard: {
    padding: 0,
  },
  sectionGap: {
    marginTop: SPACING.md,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  actionRail: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  actionItem: {
    minWidth: SPACING.cardMinWidth,
  },
  accountCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  accountCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  accountName: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  accountEmail: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  syncStatus: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
  logoutButton: {
    alignItems: "center",
    borderColor: COLORS.danger,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  logoutButtonPressed: {
    opacity: 0.72,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
