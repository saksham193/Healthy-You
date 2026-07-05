import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { updateCurrentUser } from "../../services/api/UserApi";
import { useAuthStore } from "../../store/authStore";
import { useFitnessStore } from "../../store/fitnessStore";
import { useNutritionStore } from "../../store/nutritionStore";
import { useProfileSettingsStore, type LocalProfileDisplay } from "../../store/profileSettingsStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { BodyMetric, ProfileData } from "../../types";

type ProfileDraft = {
  name: string;
  age: string;
  heightCm: string;
  weightKg: string;
  primaryGoal: string;
};

type SettingRowProps = {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

const emptyDraft: ProfileDraft = {
  name: "",
  age: "",
  heightCm: "",
  weightKg: "",
  primaryGoal: "",
};

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? `${value}` : value.toFixed(1);

const parsePositiveNumber = (value: string): number | undefined => {
  const normalized = value.trim().replace(/[^\d.]/g, "");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const metricValueToNumber = (metric: BodyMetric | undefined): number | undefined => {
  if (!metric) return undefined;

  return parsePositiveNumber(metric.value);
};

const metricDraftValue = (value: number | undefined): string => (value ? formatNumber(value) : "");

const applyLocalProfileEdits = (
  profile: ProfileData,
  localProfile: LocalProfileDisplay | null,
): ProfileData => {
  if (!localProfile) return profile;

  const heightCm = localProfile.heightCm;
  const weightKg = localProfile.weightKg;
  const bmi = heightCm && weightKg ? weightKg / ((heightCm / 100) ** 2) : undefined;

  return {
    ...profile,
    summary: {
      ...profile.summary,
      name: localProfile.name ?? profile.summary.name,
      age: localProfile.age ?? profile.summary.age,
    },
    bodyMetrics: profile.bodyMetrics.map((metric) => {
      if (metric.id === "height" && heightCm) {
        return { ...metric, value: `${formatNumber(heightCm)} cm`, subtitle: "Saved locally on this device" };
      }

      if (metric.id === "weight" && weightKg) {
        return { ...metric, value: `${formatNumber(weightKg)} kg`, subtitle: "Saved locally on this device" };
      }

      if (metric.id === "bmi" && bmi) {
        return { ...metric, value: bmi.toFixed(1), subtitle: "Calculated from local height and weight" };
      }

      return metric;
    }),
  };
};

export default function ProfileScreen() {
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const loadCurrentUser = useAuthStore((state) => state.loadCurrentUser);
  const logout = useAuthStore((state) => state.logout);
  const { data, error, loading } = useHealthData();
  const devices = useDevices();
  const profile = data.profile;
  const healthScore = data.healthScore;
  const localProfile = useProfileSettingsStore((state) => state.profile);
  const hydrateLocalProfile = useProfileSettingsStore((state) => state.hydrate);
  const saveLocalProfile = useProfileSettingsStore((state) => state.saveProfile);
  const localProfileHydrated = useProfileSettingsStore((state) => state.hydrated);
  const nutritionMeals = useNutritionStore((state) => state.meals);
  const hydrationLogs = useNutritionStore((state) => state.hydration);
  const hydrateNutrition = useNutritionStore((state) => state.hydrate);
  const clearNutrition = useNutritionStore((state) => state.clearAll);
  const workoutCompletions = useFitnessStore((state) => state.completions);
  const hydrateFitness = useFitnessStore((state) => state.hydrate);
  const clearFitness = useFitnessStore((state) => state.clearAll);
  const habitCompletions = useScheduleStore((state) => state.habitCompletions);
  const medicationLogs = useScheduleStore((state) => state.medicationLogs);
  const hydrateSchedule = useScheduleStore((state) => state.hydrate);
  const clearSchedule = useScheduleStore((state) => state.clearAll);
  const [editVisible, setEditVisible] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [savingProfile, setSavingProfile] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [exportPreview, setExportPreview] = useState("");
  const [resettingLocalData, setResettingLocalData] = useState(false);
  const effectiveProfile = useMemo(
    () => (profile ? applyLocalProfileEdits(profile, localProfile) : null),
    [localProfile, profile],
  );
  const localWellnessEntryCount =
    nutritionMeals.length +
    hydrationLogs.length +
    workoutCompletions.length +
    habitCompletions.length +
    medicationLogs.length;

  useEffect(() => {
    void hydrateLocalProfile();
    void hydrateNutrition();
    void hydrateFitness();
    void hydrateSchedule();
  }, [hydrateFitness, hydrateLocalProfile, hydrateNutrition, hydrateSchedule]);

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

  if (!profile || !healthScore || !effectiveProfile) {
    return (
      <ScreenContainer>
        <AppHeader
          subtitle="Your personal health identity center"
          theme={{
            actionBackgroundColor: "rgba(5, 45, 78, 0.10)",
            backgroundColor: COLORS.brandAqua,
            foregroundColor: COLORS.purpleInk,
            glowAccentColor: COLORS.brandDeepBlue,
            glowColor: COLORS.brandCyan,
            subtitleColor: COLORS.purpleInk,
          }}
          title="Health Profile"
        />
        <ScreenSheet>
          <CustomCard style={styles.scoreCard}>
            <EmptyState
              icon={error ? "alert-circle-outline" : "person-outline"}
              loading={!error && loading}
              subtitle={error ?? (loading ? "Loading your profile." : "Profile data is unavailable.")}
              title={error ? "Unable to load profile" : "Preparing profile"}
            />
          </CustomCard>
        </ScreenSheet>
      </ScreenContainer>
    );
  }

  const profileSummary = {
    ...effectiveProfile.summary,
    healthScore: healthScore.score,
    healthStatus: healthScore.status,
    monthlyChange: healthScore.change,
  };
  const primaryEmergencyContact = effectiveProfile.emergencyContacts[0];
  const currentHeight = localProfile?.heightCm ?? metricValueToNumber(effectiveProfile.bodyMetrics.find((metric) => metric.id === "height"));
  const currentWeight = localProfile?.weightKg ?? metricValueToNumber(effectiveProfile.bodyMetrics.find((metric) => metric.id === "weight"));
  const accountDisplayName = localProfile?.name ?? authUser?.name ?? effectiveProfile.summary.name;
  const primaryGoalLabel = localProfile?.primaryGoal ?? effectiveProfile.healthGoals[0]?.title ?? "Not set";

  const openEditProfile = () => {
    setDraft({
      name: accountDisplayName,
      age: metricDraftValue(localProfile?.age ?? effectiveProfile.summary.age),
      heightCm: metricDraftValue(currentHeight),
      weightKg: metricDraftValue(currentWeight),
      primaryGoal: primaryGoalLabel === "Not set" ? "" : primaryGoalLabel,
    });
    setEditVisible(true);
  };

  const saveProfileEdits = async () => {
    const nextName = draft.name.trim();

    if (!nextName) {
      Alert.alert("Name required", "Add a display name before saving your profile.");
      return;
    }

    const age = parsePositiveNumber(draft.age);
    const heightCm = parsePositiveNumber(draft.heightCm);
    const weightKg = parsePositiveNumber(draft.weightKg);
    const primaryGoal = draft.primaryGoal.trim();
    const nextProfile: LocalProfileDisplay = {
      name: nextName,
      age,
      heightCm,
      weightKg,
      primaryGoal: primaryGoal || undefined,
      updatedAt: new Date().toISOString(),
    };

    setSavingProfile(true);
    try {
      await saveLocalProfile(nextProfile);

      let cloudMessage = "Saved locally on this device.";
      if (isAuthenticated && authUser?.name !== nextName) {
        try {
          await updateCurrentUser(nextName);
          await loadCurrentUser();
          cloudMessage = "Saved locally and updated your account display name.";
        } catch {
          cloudMessage = "Saved locally. Account name sync can retry when the backend is reachable.";
        }
      }

      setEditVisible(false);
      Alert.alert("Profile saved", cloudMessage);
    } catch (saveError) {
      Alert.alert(
        "Profile not saved",
        saveError instanceof Error ? saveError.message : "Unable to save local profile edits right now.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const buildLocalExportPreview = async () => {
    await Promise.all([
      hydrateLocalProfile(),
      hydrateNutrition(),
      hydrateFitness(),
      hydrateSchedule(),
    ]);

    const profileSnapshot = useProfileSettingsStore.getState().profile;
    const nutritionState = useNutritionStore.getState();
    const fitnessState = useFitnessStore.getState();
    const scheduleState = useScheduleStore.getState();
    const exported = {
      exportedAt: new Date().toISOString(),
      betaNotice: "This is a local device export preview. It is not a cloud export or account deletion receipt.",
      profile: {
        displayName: profileSnapshot?.name ?? accountDisplayName,
        email: authUser?.email ?? null,
        age: profileSnapshot?.age ?? effectiveProfile.summary.age,
        heightCm: profileSnapshot?.heightCm ?? currentHeight ?? null,
        weightKg: profileSnapshot?.weightKg ?? currentWeight ?? null,
        primaryGoal: profileSnapshot?.primaryGoal ?? null,
        profileSyncStatus: profileSyncLabel,
        localProfileUpdatedAt: profileSnapshot?.updatedAt ?? null,
      },
      nutrition: {
        meals: nutritionState.meals,
        hydrationLogs: nutritionState.hydration,
      },
      fitness: {
        workoutCompletions: fitnessState.completions,
      },
      schedule: {
        habitCompletions: scheduleState.habitCompletions,
        medicationLogs: scheduleState.medicationLogs,
      },
      privacyNotes: [
        "Phase 4C nutrition, hydration, workout, habit, and medication logs are local to this device.",
        "Clearing local wellness data removes these local logs without logging out.",
        "Account deletion is deferred in this beta build because no backend deletion endpoint is available.",
      ],
    };

    setExportPreview(JSON.stringify(exported, null, 2));
    setExportVisible(true);
  };

  const clearLocalWellnessData = async () => {
    setResettingLocalData(true);
    try {
      await Promise.all([clearNutrition(), clearFitness(), clearSchedule()]);
      Alert.alert(
        "Local data cleared",
        "Nutrition, hydration, workout, habit, and medication logs stored on this device were cleared. Your sign-in session was not changed.",
      );
    } catch (clearError) {
      Alert.alert(
        "Unable to clear data",
        clearError instanceof Error ? clearError.message : "Local wellness data could not be cleared right now.",
      );
    } finally {
      setResettingLocalData(false);
    }
  };

  const confirmClearLocalWellnessData = () => {
    Alert.alert(
      "Clear local wellness data?",
      "This removes local nutrition, hydration, workout, habit, and medication logs from this device. It does not delete your account or sign you out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: resettingLocalData ? "Clearing..." : "Clear Data",
          style: "destructive",
          onPress: () => void clearLocalWellnessData(),
        },
      ],
    );
  };

  const showPrivacyNotice = () => {
    Alert.alert(
      "Privacy & Data",
      "Phase 4C wellness logs are stored locally on this device unless a sync status explicitly says otherwise. You can preview the local export or clear local wellness data from this screen.",
    );
  };

  const showAccountDeletionNotice = () => {
    Alert.alert(
      "Account deletion in beta",
      "This beta build does not expose a validated backend account deletion endpoint yet. You can clear local wellness data from this device now; full account deletion remains a release follow-up.",
    );
  };

  const handleProfileAction = (title: string) => {
    const normalizedTitle = title.toLowerCase();

    if (normalizedTitle.includes("edit")) {
      openEditProfile();
      return;
    }

    if (normalizedTitle.includes("export") || normalizedTitle.includes("share")) {
      void buildLocalExportPreview();
      return;
    }

    if (normalizedTitle.includes("device")) {
      void devices.handleDevicePress();
      return;
    }

    Alert.alert(title, "This beta action is not connected yet. Profile, export, permissions, local reset, and logout controls are available on this screen.");
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
      <AppHeader
        subtitle="Your personal health identity center"
        theme={{
          actionBackgroundColor: "rgba(5, 45, 78, 0.10)",
          backgroundColor: COLORS.brandAqua,
          foregroundColor: COLORS.purpleInk,
          glowAccentColor: COLORS.brandDeepBlue,
          glowColor: COLORS.brandCyan,
          subtitleColor: COLORS.purpleInk,
        }}
        title="Health Profile"
      >
        <ProfileHeaderCard onEditPress={openEditProfile} profile={profileSummary} />
      </AppHeader>

      <ScreenSheet>
        <CustomCard style={styles.scoreCard}>
          <ProgressRing
            backgroundColor={COLORS.brandSoftBlue}
            color={COLORS.brandDeepBlue}
            max={100}
            size={118}
            value={healthScore.score}
          />
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
          {effectiveProfile.bodyMetrics.map((metric) => (
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
          {effectiveProfile.vitalMetrics.map((metric) => (
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
        {localProfile?.primaryGoal ? (
          <CustomCard style={styles.primaryGoalCard}>
            <Text style={styles.eyebrow}>Primary goal</Text>
            <Text style={styles.primaryGoalText}>{localProfile.primaryGoal}</Text>
          </CustomCard>
        ) : null}
        <View style={styles.list}>
          {effectiveProfile.healthGoals.map((goal) => (
            <GoalProgressCard goal={goal} key={goal.id} />
          ))}
        </View>

        <DashboardSection title="Medical Information" />
        <View style={styles.infoGrid}>
          {effectiveProfile.medicalInfo.map((item) => (
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
              loading={!devices.error && devices.loading}
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
          {effectiveProfile.emergencyContacts.map((contact) => (
            <EmergencyContactCard contact={contact} key={contact.id} />
          ))}
        </View>

        <DashboardSection title="Health Achievements" />
        <View style={styles.infoGrid}>
          {effectiveProfile.achievements.map((achievement) => (
            <AchievementCard achievement={achievement} key={achievement.id} />
          ))}
        </View>

        <DashboardSection title="Account" />
        <CustomCard style={styles.accountCard}>
          <View style={styles.accountCopy}>
            <Text style={styles.accountName}>{accountDisplayName}</Text>
            <Text style={styles.accountEmail}>{authUser?.email ?? "Signed in on this device"}</Text>
            <Text style={styles.accountMeta}>
              Profile edits: {localProfileHydrated ? "Local changes enabled" : "Loading local settings"}
            </Text>
            <View style={styles.syncStatusList}>
              <View style={styles.syncStatusPill}>
                <Text numberOfLines={2} style={styles.syncStatus}>
                  {profileSyncLabel}
                  {data.queuedProfileUpdateCount > 0 ? ` (${data.queuedProfileUpdateCount})` : ""}
                </Text>
              </View>
              <View style={styles.syncStatusPill}>
                <Text numberOfLines={2} style={styles.syncStatus}>
                  {healthBackupLabel}
                  {data.queuedHealthSummaryBackupCount > 0 ? ` (${data.queuedHealthSummaryBackupCount})` : ""}
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Log out"
            accessibilityRole="button"
            disabled={isAuthLoading}
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              (pressed || isAuthLoading) && styles.logoutButtonPressed,
            ]}
          >
            <Text numberOfLines={1} style={styles.logoutText}>{isAuthLoading ? "Signing out..." : "Log Out"}</Text>
          </Pressable>
        </CustomCard>

        <DashboardSection title="Privacy & Data" />
        <CustomCard style={styles.settingsCard}>
          <SettingRow
            iconName="shield-checkmark-outline"
            onPress={showPrivacyNotice}
            subtitle="Local-only Phase 4C logs are identified clearly. No cloud sync is claimed for them."
            title="Privacy Notes"
          />
          <SettingRow
            iconName="document-text-outline"
            onPress={() => void buildLocalExportPreview()}
            subtitle="Preview profile display data plus nutrition, fitness, habit, and medication logs as JSON."
            title="Export Local Data"
          />
          <SettingRow
            destructive
            disabled={resettingLocalData}
            iconName="trash-outline"
            onPress={confirmClearLocalWellnessData}
            subtitle={`${localWellnessEntryCount} local wellness entries on this device. Sign-in is unchanged.`}
            title={resettingLocalData ? "Clearing Local Data" : "Clear Local Wellness Data"}
          />
          <SettingRow
            destructive
            iconName="person-remove-outline"
            onPress={showAccountDeletionNotice}
            subtitle="Backend account deletion is beta-deferred until a validated endpoint exists."
            title="Account Deletion"
          />
        </CustomCard>

        <DashboardSection title="Permissions" />
        <CustomCard style={styles.permissionCard}>
          <View style={styles.permissionHeader}>
            <View style={styles.permissionIcon}>
              <Ionicons color={COLORS.brandDeepBlue} name="watch-outline" size={20} />
            </View>
            <View style={styles.permissionCopy}>
              <Text style={styles.permissionTitle}>Health Connect / Device Sync</Text>
              <Text style={styles.permissionStatus}>{devices.syncStatusLabel}</Text>
            </View>
          </View>
          <Text style={styles.permissionText}>
            Device permissions are handled by the connected health provider. Phase 4C local wellness logs stay on this device and can be cleared here.
          </Text>
          <Pressable
            accessibilityLabel="Review device permissions"
            accessibilityRole="button"
            onPress={() => void devices.handleDevicePress()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
          >
            <Ionicons color={COLORS.brandDeepBlue} name="refresh-outline" size={18} />
            <Text style={styles.secondaryButtonText}>Review Device Sync</Text>
          </Pressable>
        </CustomCard>

        <DashboardSection title="About / Beta" />
        <CustomCard style={styles.betaCard}>
          <Text style={styles.betaTitle}>Beta data controls</Text>
          <Text style={styles.betaText}>
            Profile edits, export preview, local wellness reset, device permission clarity, and logout are available for beta use. Full account deletion remains deferred until backend support is added.
          </Text>
        </CustomCard>

        <DashboardSection title="Quick Actions" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionRail}
        >
          {effectiveProfile.actions.map((action) => (
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

      <Modal animationType="slide" transparent visible={editVisible} onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSubtitle}>Safe display fields for this beta build</Text>
              </View>
              <Pressable
                accessibilityLabel="Close edit profile"
                accessibilityRole="button"
                onPress={() => setEditVisible(false)}
                style={styles.iconButton}
              >
                <Ionicons color={COLORS.textMuted} name="close-outline" size={24} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <FormField
                label="Display name"
                onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
                placeholder="Your name"
                value={draft.name}
              />
              <View style={styles.draftRow}>
                <FormField
                  keyboardType="numeric"
                  label="Age"
                  onChangeText={(age) => setDraft((current) => ({ ...current, age }))}
                  placeholder="Age"
                  value={draft.age}
                />
                <FormField
                  keyboardType="numeric"
                  label="Height (cm)"
                  onChangeText={(heightCm) => setDraft((current) => ({ ...current, heightCm }))}
                  placeholder="Height"
                  value={draft.heightCm}
                />
              </View>
              <View style={styles.draftRow}>
                <FormField
                  keyboardType="numeric"
                  label="Weight (kg)"
                  onChangeText={(weightKg) => setDraft((current) => ({ ...current, weightKg }))}
                  placeholder="Weight"
                  value={draft.weightKg}
                />
                <FormField
                  label="Primary goal"
                  onChangeText={(primaryGoal) => setDraft((current) => ({ ...current, primaryGoal }))}
                  placeholder="Wellness goal"
                  value={draft.primaryGoal}
                />
              </View>
              <Text style={styles.modalNote}>
                Name sync uses the existing account endpoint when available. Age, height, weight, and goal are saved as local display settings in this beta build.
              </Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityLabel="Cancel profile edit"
                accessibilityRole="button"
                onPress={() => setEditVisible(false)}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.secondaryButtonPressed]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Save profile"
                accessibilityRole="button"
                disabled={savingProfile}
                onPress={() => void saveProfileEdits()}
                style={({ pressed }) => [
                  styles.saveButton,
                  (pressed || savingProfile) && styles.saveButtonPressed,
                ]}
              >
                <Text style={styles.saveButtonText}>{savingProfile ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={exportVisible} onRequestClose={() => setExportVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.exportModalCard]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Local Data Export</Text>
                <Text style={styles.modalSubtitle}>Preview JSON for this device</Text>
              </View>
              <Pressable
                accessibilityLabel="Close export preview"
                accessibilityRole="button"
                onPress={() => setExportVisible(false)}
                style={styles.iconButton}
              >
                <Ionicons color={COLORS.textMuted} name="close-outline" size={24} />
              </Pressable>
            </View>
            <ScrollView style={styles.exportPreviewBox}>
              <Text selectable style={styles.exportPreviewText}>{exportPreview}</Text>
            </ScrollView>
            <Pressable
              accessibilityLabel="Close local export"
              accessibilityRole="button"
              onPress={() => setExportVisible(false)}
              style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
            >
              <Text style={styles.saveButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function SettingRow({
  iconName,
  title,
  subtitle,
  onPress,
  destructive = false,
  disabled = false,
}: SettingRowProps) {
  const color = destructive ? COLORS.danger : COLORS.brandDeepBlue;
  const backgroundColor = destructive ? COLORS.dangerLight : COLORS.brandSoftBlue;

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        (pressed || disabled) && styles.settingRowPressed,
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor }]}>
        <Ionicons color={color} name={iconName} size={20} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, destructive && styles.destructiveText]}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons color={COLORS.textMuted} name="chevron-forward-outline" size={18} />
    </Pressable>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        style={styles.textInput}
        value={value}
      />
    </View>
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  statusText: {
    color: COLORS.primaryDark,
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
  primaryGoalCard: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  eyebrow: {
    color: COLORS.brandDeepBlue,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: "uppercase",
  },
  primaryGoalText: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  accountCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  accountCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  accountName: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.lg,
  },
  accountEmail: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  accountMeta: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  syncStatusList: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  syncStatusPill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.lg,
    maxWidth: "100%",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  syncStatus: {
    color: COLORS.primaryDark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: 16,
  },
  logoutButton: {
    alignItems: "center",
    borderColor: COLORS.danger,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: "flex-start",
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
  settingsCard: {
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  settingRow: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: SPACING.md,
    minHeight: 76,
    padding: SPACING.sm,
  },
  settingRowPressed: {
    opacity: 0.72,
  },
  settingIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  settingCopy: {
    flex: 1,
    gap: SPACING.xs,
    minWidth: 0,
  },
  settingTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  settingSubtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
  },
  destructiveText: {
    color: COLORS.danger,
  },
  permissionCard: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  permissionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: COLORS.brandSoftBlue,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  permissionCopy: {
    flex: 1,
  },
  permissionTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  permissionStatus: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  permissionText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: COLORS.brandDeepBlue,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.xs,
    minHeight: 42,
    paddingHorizontal: SPACING.md,
  },
  secondaryButtonPressed: {
    opacity: 0.72,
  },
  secondaryButtonText: {
    color: COLORS.brandDeepBlue,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  betaCard: {
    gap: SPACING.xs,
    padding: SPACING.lg,
  },
  betaTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  betaText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(5, 45, 78, 0.36)",
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    maxHeight: "88%",
    padding: SPACING.lg,
    width: "100%",
  },
  exportModalCard: {
    minHeight: "72%",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.lg,
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 18,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  draftRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  formField: {
    flex: 1,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    minWidth: SPACING.cardMinWidth,
  },
  formLabel: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    minHeight: 46,
    paddingHorizontal: SPACING.md,
  },
  modalNote: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "flex-end",
    marginTop: SPACING.sm,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: COLORS.brandDeepBlue,
    borderRadius: 16,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  saveButtonPressed: {
    opacity: 0.72,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  exportPreviewBox: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  exportPreviewText: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 18,
  },
});
