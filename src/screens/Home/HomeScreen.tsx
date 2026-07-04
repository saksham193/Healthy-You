import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import FeatureGridCard from "../../components/home/FeatureGridCard";
import WatchSyncCard from "../../components/home/WatchSyncCard";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityChart from "../../components/layout/ActivityChart";
import AppHeader from "../../components/layout/AppHeader";
import DashboardSection from "../../components/layout/DashboardSection";
import ProgressRing from "../../components/layout/ProgressRing";
import ScreenSheet from "../../components/layout/ScreenSheet";
import StatsCard from "../../components/layout/StatsCard";
import EmptyState from "../../components/layout/EmptyState";
import { useHealthData } from "../../hooks/useHealthData";
import { COLORS, DATA_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getHomeFeatureToneColors } from "../../utils/tone";
import type { RootTabParamList } from "../../types";

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, "Data">;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { data, error, loading } = useHealthData();
  const healthScore = data.healthScore;
  const vitals = data.vitals;

  const handleFeaturePress = (id: string) => {
    if (id === "nutrition") {
      navigation.navigate("Nutrition");
      return;
    }

    if (id === "fitness") {
      navigation.navigate("Fitness");
      return;
    }

    if (id === "schedule") {
      navigation.navigate("Schedule");
      return;
    }

    Alert.alert("Sleep", "Sleep details are summarized on your dashboard.");
  };

  if (!vitals || !healthScore) {
    return (
      <ScreenContainer>
        <View style={styles.shell}>
          <AppHeader
            showSearch
            theme={{
              actionBackgroundColor: "rgba(113, 63, 18, 0.10)",
              backgroundColor: DATA_COLORS.primary,
              foregroundColor: DATA_COLORS.ink,
              glowAccentColor: DATA_COLORS.secondary,
              glowColor: DATA_COLORS.light,
              subtitleColor: DATA_COLORS.ink,
            }}
            title="Your Health Overview"
          />
          <ScreenSheet>
            <EmptyState
              accentColor={DATA_COLORS.dark}
              backgroundColor={DATA_COLORS.light}
              icon={error ? "alert-circle-outline" : "pulse-outline"}
              loading={!error && loading}
              subtitle={error ?? (loading ? "Loading your health dashboard." : "Health dashboard data is unavailable.")}
              title={error ? "Unable to load dashboard" : "Preparing dashboard"}
            />
          </ScreenSheet>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.shell}>
        <AppHeader
          showSearch
          theme={{
            actionBackgroundColor: "rgba(113, 63, 18, 0.10)",
            backgroundColor: DATA_COLORS.primary,
            foregroundColor: DATA_COLORS.ink,
            glowAccentColor: DATA_COLORS.secondary,
            glowColor: DATA_COLORS.light,
            subtitleColor: DATA_COLORS.ink,
          }}
          title="Your Health Overview"
        />

        <ScreenSheet>
          <CustomCard style={styles.healthScoreCard}>
            <ProgressRing
              backgroundColor={DATA_COLORS.light}
              color={DATA_COLORS.dark}
              max={100}
              size={92}
              value={healthScore.score}
            />
            <View style={styles.healthScoreCopy}>
              <Text style={styles.eyebrow}>Today's Health Score</Text>
              <Text style={styles.healthScoreValue}>{healthScore.score} / 100</Text>
              <View style={styles.healthScoreMeta}>
                <View style={styles.healthStatusChip}>
                  <Ionicons color={DATA_COLORS.ink} name="sparkles-outline" size={14} />
                  <Text style={styles.healthStatusText}>{healthScore.status}</Text>
                </View>
                <Text numberOfLines={2} style={styles.healthChange}>{healthScore.change}</Text>
              </View>
            </View>
          </CustomCard>

          <DashboardSection title="Daily Activity Summary" actionLabel="See All" />

          <View style={styles.summaryGrid}>
            {vitals.healthSummaries.map((summary) => (
              <StatsCard
                icon={summary.iconName}
                key={summary.id}
                style={styles.summaryCard}
                subtitle={summary.suffix}
                title={summary.title}
                tone={summary.tone}
                value={summary.value}
              />
            ))}
          </View>

          <DashboardSection title="Health Dashboard" actionLabel="See All" />
          <ActivityChart
            labels={vitals.labels}
            accentColor={DATA_COLORS.dark}
            subtitle="Systolic / Diastolic"
            title="Blood Pressure"
            trackColor={DATA_COLORS.light}
            values={vitals.bloodPressurePoints}
          />

          <DashboardSection title="Blood Glucose Levels" actionLabel="See All" />
          <ActivityChart
            accentColor={DATA_COLORS.dark}
            labels={vitals.labels}
            mode="dot"
            trackColor={DATA_COLORS.light}
            values={vitals.glucosePoints}
          />

          <View style={styles.summaryGrid}>
            <StatsCard
              icon="moon-outline"
              style={styles.summaryCard}
              subtitle="Rest Duration"
              title="Sleep Record"
              tone="warning"
              value="5-6 hours"
            />
            <StatsCard
              icon="analytics-outline"
              style={styles.summaryCard}
              subtitle="Quality"
              title="Sleep Quality"
              tone="warning"
              value="31%"
            />
          </View>

          <DashboardSection title="Feature Cards" />
          <View style={styles.featureGrid}>
            {vitals.homeFeatures.map((feature) => (
              <FeatureGridCard
                feature={feature}
                key={feature.id}
                onPress={() => handleFeaturePress(feature.id)}
                toneColorsOverride={getHomeFeatureToneColors(feature.id, feature.tone)}
              />
            ))}
          </View>

          <WatchSyncCard />
        </ScreenSheet>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  summaryCard: {
    flexBasis: "48%",
    minWidth: SPACING.cardMinWidth,
  },
  healthScoreCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  healthScoreCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  healthScoreValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.xl,
    marginTop: SPACING.xs,
  },
  healthScoreMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  healthStatusChip: {
    alignItems: "center",
    backgroundColor: DATA_COLORS.light,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  healthStatusText: {
    color: DATA_COLORS.ink,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  healthChange: {
    color: COLORS.textMuted,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    minWidth: 88,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
});
