import React from "react";
import { StyleSheet, Text, View } from "react-native";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import AppHeader from "../../components/layout/AppHeader";
import DashboardSection from "../../components/layout/DashboardSection";
import EmptyState from "../../components/layout/EmptyState";
import ScreenSheet from "../../components/layout/ScreenSheet";
import StatsCard from "../../components/layout/StatsCard";
import { useHealthData } from "../../hooks/useHealthData";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

export default function SleepScreen() {
  const { data, error, loading } = useHealthData();
  const sleep = data.sleep;

  if (!sleep) {
    return (
      <ScreenContainer>
        <View style={styles.shell}>
          <AppHeader title="Recovery" subtitle="Sleep Tracking" />
          <ScreenSheet>
            <CustomCard style={styles.welcomeCard}>
              <EmptyState
                icon={error ? "alert-circle-outline" : "moon-outline"}
                subtitle={error ?? (loading ? "Loading your sleep dashboard." : "Sleep data is unavailable.")}
                title={error ? "Unable to load sleep" : "Preparing sleep"}
              />
            </CustomCard>
          </ScreenSheet>
        </View>
      </ScreenContainer>
    );
  }

  const durationInsight = sleep.insights.find((insight) => insight.id === "duration");
  const qualityInsight = sleep.insights.find((insight) => insight.id === "quality");
  const durationValue = durationInsight?.value ?? "7h 30m";
  const qualityValue = qualityInsight?.value ?? "82%";

  return (
    <ScreenContainer>
      <View style={styles.shell}>
        <AppHeader title="Recovery" subtitle="Sleep Tracking" />
        <ScreenSheet>
          <CustomCard style={styles.heroCard}>
            <Text style={styles.duration}>{durationValue}</Text>
            <Text style={styles.mutedOnDark}>Last night's sleep duration</Text>
            <View style={styles.qualityRow}>
              <Text style={styles.qualityLabel}>Sleep Quality</Text>
              <Text style={styles.qualityValue}>{qualityValue}</Text>
            </View>
          </CustomCard>

          <View style={styles.statsRow}>
            <StatsCard
              icon="moon-outline"
              subtitle={durationInsight?.detail ?? "Within target"}
              title="Duration"
              tone="warning"
              value={durationValue}
            />
            <StatsCard
              icon="sparkles-outline"
              subtitle={qualityInsight?.detail ?? "Restful night"}
              title="Quality"
              tone="accent"
              value={qualityValue}
            />
          </View>

          <DashboardSection title="Sleep Insights" />
          <View style={styles.list}>
            {sleep.insights.map((insight) => (
              <CustomCard key={insight.id} style={styles.insightCard}>
                <Text style={styles.cardTitle}>{insight.title}</Text>
                <Text style={styles.insightValue}>{insight.value}</Text>
                <Text style={styles.muted}>{insight.detail}</Text>
              </CustomCard>
            ))}
          </View>
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
  heroCard: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  duration: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.hero,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  qualityRow: {
    alignItems: "center",
    backgroundColor: COLORS.overlaySubtle,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xl,
    padding: SPACING.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  qualityLabel: {
    color: COLORS.primaryLight,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  qualityValue: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  list: {
    gap: SPACING.md,
  },
  insightCard: {
    minHeight: 128,
  },
  welcomeCard: {
    padding: 0,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  insightValue: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.sm,
  },
  muted: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  mutedOnDark: {
    color: COLORS.primaryLight,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
});
