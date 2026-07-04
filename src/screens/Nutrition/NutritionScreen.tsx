import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import AppHeader from "../../components/layout/AppHeader";
import DashboardSection from "../../components/layout/DashboardSection";
import ProgressRing from "../../components/layout/ProgressRing";
import ScreenSheet from "../../components/layout/ScreenSheet";
import StatsCard from "../../components/layout/StatsCard";
import EmptyState from "../../components/layout/EmptyState";
import AyurvedaSection from "../../components/nutrition/AyurvedaSection";
import FoodEducationSection from "../../components/nutrition/FoodEducationSection";
import MacroCard from "../../components/nutrition/MacroCard";
import NutritionActionCard from "../../components/nutrition/NutritionActionCard";
import NutritionInsightCard from "../../components/nutrition/NutritionInsightCard";
import NutritionMealCard from "../../components/nutrition/NutritionMealCard";
import { useHealthData } from "../../hooks/useHealthData";
import { COLORS, NUTRITION_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { MacroNutrient } from "../../types";
import { getNutritionInsightToneColors, getNutritionMacroToneColors } from "../../utils/tone";

const nutritionTabs = ["Personalized Plan", "Ayurveda", "Recipes"] as const;
type NutritionTab = (typeof nutritionTabs)[number];

const getMacro = (macros: MacroNutrient[], id: string): MacroNutrient | undefined =>
  macros.find((macro) => macro.id === id);

export default function NutritionScreen() {
  const [selectedTab, setSelectedTab] = useState<NutritionTab>("Personalized Plan");
  const [segmentWidth, setSegmentWidth] = useState(0);
  const indicatorOffset = useRef(new Animated.Value(0)).current;
  const { data, error, loading } = useHealthData();
  const nutrition = data.nutrition;
  const selectedTabIndex = nutritionTabs.indexOf(selectedTab);

  useEffect(() => {
    Animated.spring(indicatorOffset, {
      damping: 18,
      mass: 0.8,
      stiffness: 180,
      toValue: selectedTabIndex * segmentWidth,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [indicatorOffset, segmentWidth, selectedTabIndex]);

  if (!nutrition) {
    return (
      <ScreenContainer>
        <View style={styles.shell}>
          <AppHeader
            showSearch
            subtitle="Track calories, hydration and meals"
            theme={{
              actionBackgroundColor: "rgba(6, 78, 59, 0.10)",
              backgroundColor: NUTRITION_COLORS.primary,
              foregroundColor: NUTRITION_COLORS.ink,
              glowAccentColor: NUTRITION_COLORS.secondary,
              glowColor: NUTRITION_COLORS.light,
              subtitleColor: NUTRITION_COLORS.ink,
            }}
            title="Daily Nutrition"
          />
          <ScreenSheet>
            <EmptyState
              accentColor={NUTRITION_COLORS.secondary}
              backgroundColor={NUTRITION_COLORS.light}
              icon={error ? "alert-circle-outline" : "nutrition-outline"}
              loading={!error && loading}
              subtitle={error ?? (loading ? "Loading your nutrition dashboard." : "Nutrition data is unavailable.")}
              title={error ? "Unable to load nutrition" : "Preparing nutrition"}
            />
          </ScreenSheet>
        </View>
      </ScreenContainer>
    );
  }

  const { summary } = nutrition;
  const calorieProgress = Math.round((summary.caloriesConsumed / summary.calorieGoal) * 100);
  const waterProgress = Math.round((summary.waterGlasses / summary.waterGoal) * 100);
  const protein = getMacro(nutrition.macros, "protein");
  const carbs = getMacro(nutrition.macros, "carbs");
  const fat = getMacro(nutrition.macros, "fat");
  const macroRows = [protein, carbs, fat].filter((macro): macro is MacroNutrient => Boolean(macro));
  const calorieTone = getNutritionInsightToneColors("calories", "Calories", "primary");
  const waterTone = getNutritionInsightToneColors("hydration", "Hydration", "warning");
  const onTabsLayout = (event: LayoutChangeEvent): void => {
    setSegmentWidth(event.nativeEvent.layout.width / nutritionTabs.length);
  };
  const handleNutritionAction = (title: string) => {
    Alert.alert(title, "This nutrition action is ready for the next connected workflow.");
  };

  return (
    <ScreenContainer>
      <View style={styles.shell}>
        <AppHeader
          showSearch
          subtitle="Track calories, hydration and meals"
          theme={{
            actionBackgroundColor: "rgba(6, 78, 59, 0.10)",
            backgroundColor: NUTRITION_COLORS.primary,
            foregroundColor: NUTRITION_COLORS.ink,
            glowAccentColor: NUTRITION_COLORS.secondary,
            glowColor: NUTRITION_COLORS.light,
            subtitleColor: NUTRITION_COLORS.ink,
          }}
          title="Daily Nutrition"
        >
          <CustomCard style={styles.scoreCard}>
            <View>
              <Text style={styles.scoreLabel}>Nutrition Score</Text>
              <Text style={styles.scoreValue}>{summary.score} / 100</Text>
              <Text style={styles.scoreStatus}>{summary.scoreLabel}</Text>
            </View>
            <View style={styles.scoreIcon}>
              <Ionicons color={NUTRITION_COLORS.secondary} name="ribbon-outline" size={24} />
            </View>
          </CustomCard>
        </AppHeader>

        <ScreenSheet>
          <View onLayout={onTabsLayout} style={styles.segmentedControl}>
            {segmentWidth > 0 ? (
              <Animated.View
                style={[
                  styles.segmentIndicator,
                  {
                    transform: [{ translateX: indicatorOffset }],
                    width: segmentWidth,
                  },
                ]}
              />
            ) : null}
            {nutritionTabs.map((tab) => {
              const active = tab === selectedTab;

              return (
                <TouchableOpacity
                  accessibilityLabel={tab}
                  accessibilityRole="tab"
                  activeOpacity={0.78}
                  key={tab}
                  onPress={() => setSelectedTab(tab)}
                  style={styles.segmentButton}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{tab}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedTab === "Personalized Plan" ? (
            <>
              <CustomCard style={styles.dailyIntakeCard}>
                <View style={styles.donutWrap}>
                  <View style={styles.donutOuter}>
                    <View style={styles.donutMiddle}>
                      <View style={styles.donutInner}>
                        <Text style={styles.donutValue}>{summary.caloriesConsumed}</Text>
                        <Text style={styles.donutLabel}>Calories</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.dailyIntakeCopy}>
                  <Text numberOfLines={2} style={styles.cardTitle}>Daily Calorie Intake</Text>
                  <Text numberOfLines={2} style={styles.dailySubtitle}>{calorieProgress}% of {summary.calorieGoal} kcal goal</Text>
                  <View style={styles.macroSummaryList}>
                    {macroRows.map((macro) => {
                      const macroTone = getNutritionMacroToneColors(macro.id, macro.tone);

                      return (
                        <View key={macro.id} style={styles.macroSummaryRow}>
                          <View style={styles.macroSummaryName}>
                            <View style={[styles.macroDot, { backgroundColor: macroTone.foreground }]} />
                            <Text numberOfLines={1} style={styles.macroSummaryLabel}>{macro.name}</Text>
                          </View>
                          <Text numberOfLines={1} style={styles.macroSummaryValue}>
                            {macro.consumed}{macro.unit}
                          </Text>
                          <Text style={[styles.macroSummaryPercent, { color: macroTone.foreground }]}>
                            {macro.percent}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </CustomCard>

              <DashboardSection title="Calorie Progress" />
              <CustomCard style={styles.calorieCard}>
                <View style={styles.calorieCopy}>
                  <Text style={styles.cardEyebrow}>Calories Consumed</Text>
                  <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.heroValue}>
                    {summary.caloriesConsumed} kcal
                  </Text>
                  <View style={styles.metricGrid}>
                    <View style={[styles.metricPill, { backgroundColor: calorieTone.background }]}>
                      <Text style={styles.metricLabel}>Goal</Text>
                      <Text style={[styles.metricValue, { color: calorieTone.foreground }]}>
                        {summary.calorieGoal} kcal
                      </Text>
                    </View>
                    <View style={[styles.metricPill, { backgroundColor: calorieTone.background }]}>
                      <Text style={styles.metricLabel}>Remaining</Text>
                      <Text style={[styles.metricValue, { color: calorieTone.foreground }]}>
                        {summary.caloriesRemaining} kcal
                      </Text>
                    </View>
                  </View>
                </View>
                <ProgressRing
                  backgroundColor={calorieTone.background}
                  color={calorieTone.foreground}
                  max={summary.calorieGoal}
                  size={SPACING.bottomNavOffset}
                  value={summary.caloriesConsumed}
                />
              </CustomCard>

              <DashboardSection title="Macronutrients" />
              {nutrition.macros.length > 0 ? (
                <View style={styles.macroGrid}>
                  {nutrition.macros.map((macro) => (
                    <MacroCard key={macro.id} macro={macro} />
                  ))}
                </View>
              ) : (
                <CustomCard style={styles.emptyCard}>
                  <EmptyState
                    icon="nutrition-outline"
                    subtitle="Macro breakdowns will appear after meals are logged."
                    title="No macro data"
                  />
                </CustomCard>
              )}

              <DashboardSection title="Water Intake" />
              <CustomCard style={styles.waterCard}>
                <View style={[styles.waterIcon, { backgroundColor: waterTone.background }]}>
                  <Ionicons color={waterTone.foreground} name="water-outline" size={26} />
                </View>
                <View style={styles.waterContent}>
                  <Text numberOfLines={2} style={styles.cardTitle}>Water Intake</Text>
                  <Text style={styles.waterValue}>
                    {summary.waterGlasses} / {summary.waterGoal} Glasses
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.waterFill,
                        {
                          backgroundColor: waterTone.foreground,
                          width: `${waterProgress}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.goalText}>
                    Goal Achieved: {summary.waterGoalAchieved ? "Yes" : "No"}
                  </Text>
                </View>
                <ProgressRing
                  backgroundColor={waterTone.background}
                  color={waterTone.foreground}
                  max={summary.waterGoal}
                  value={summary.waterGlasses}
                />
              </CustomCard>

              <DashboardSection title="Today's Meals" />
              {nutrition.meals.length > 0 ? (
                <View style={styles.list}>
                  {nutrition.meals.map((meal) => (
                    <NutritionMealCard key={meal.id} meal={meal} />
                  ))}
                </View>
              ) : (
                <CustomCard style={styles.emptyCard}>
                  <EmptyState
                    icon="restaurant-outline"
                    subtitle="Logged meals will appear here."
                    title="No meals logged"
                  />
                </CustomCard>
              )}

              <DashboardSection title="Nutrition Insights" />
              {nutrition.insights.length > 0 ? (
                <View style={styles.list}>
                  {nutrition.insights.map((insight) => (
                    <NutritionInsightCard insight={insight} key={insight.id} />
                  ))}
                </View>
              ) : (
                <CustomCard style={styles.emptyCard}>
                  <EmptyState
                    icon="bulb-outline"
                    subtitle="Personalized nutrition insights will appear here."
                    title="No nutrition insights"
                  />
                </CustomCard>
              )}

              <DashboardSection title="Quick Actions" />
              {nutrition.actions.length > 0 ? (
                <View style={styles.actionsGrid}>
                  {nutrition.actions.map((action) => (
                    <NutritionActionCard
                      action={action}
                      key={action.id}
                      onPress={() => handleNutritionAction(action.title)}
                    />
                  ))}
                </View>
              ) : (
                <CustomCard style={styles.emptyCard}>
                  <EmptyState
                    icon="flash-outline"
                    subtitle="Meal logging shortcuts will appear here."
                    title="No nutrition actions"
                  />
                </CustomCard>
              )}

              <View style={styles.statsRow}>
                <StatsCard
                  icon="analytics-outline"
                  subtitle={`${calorieProgress}% of daily goal`}
                  title="Calorie Goal"
                  tone="accent"
                  toneColorsOverride={calorieTone}
                  value={`${summary.caloriesRemaining} kcal left`}
                />
                <StatsCard
                  icon="water-outline"
                  subtitle={`${waterProgress}% hydrated`}
                  title="Hydration"
                  tone="accent"
                  toneColorsOverride={waterTone}
                  value={`${summary.waterGlasses} glasses`}
                />
              </View>
            </>
          ) : null}

          {selectedTab === "Ayurveda" ? <AyurvedaSection /> : null}
          {selectedTab === "Recipes" ? <FoodEducationSection /> : null}
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
  scoreCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.lg,
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  scoreValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  scoreStatus: {
    color: NUTRITION_COLORS.dark,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
  scoreIcon: {
    alignItems: "center",
    backgroundColor: NUTRITION_COLORS.light,
    borderRadius: SPACING.xl,
    height: SPACING.xxxl + SPACING.xxl,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.xxl,
  },
  segmentedControl: {
    backgroundColor: NUTRITION_COLORS.light,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: SPACING.lg,
    overflow: "hidden",
    padding: SPACING.xs,
  },
  segmentIndicator: {
    backgroundColor: NUTRITION_COLORS.secondary,
    borderRadius: 18,
    bottom: SPACING.xs,
    left: SPACING.xs,
    position: "absolute",
    top: SPACING.xs,
  },
  segmentButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: SPACING.sm,
    zIndex: 1,
  },
  segmentText: {
    color: NUTRITION_COLORS.dark,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
  },
  segmentTextActive: {
    color: NUTRITION_COLORS.ink,
  },
  dailyIntakeCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  donutOuter: {
    alignItems: "center",
    backgroundColor: COLORS.accent,
    borderColor: NUTRITION_COLORS.secondary,
    borderRadius: 48,
    borderRightColor: COLORS.warning,
    borderTopColor: COLORS.danger,
    borderWidth: 10,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  donutMiddle: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  donutInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  donutValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  donutLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: 2,
  },
  dailyIntakeCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  dailySubtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  macroSummaryList: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  macroSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  macroSummaryName: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: SPACING.sm,
  },
  macroDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  proteinDot: {
    backgroundColor: NUTRITION_COLORS.secondary,
  },
  carbsDot: {
    backgroundColor: COLORS.accent,
  },
  fatDot: {
    backgroundColor: COLORS.warning,
  },
  macroSummaryLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  macroSummaryValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    minWidth: 48,
    textAlign: "right",
  },
  macroSummaryPercent: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    minWidth: 38,
    textAlign: "right",
  },
  calorieCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
  },
  calorieCopy: {
    flex: 1,
  },
  cardEyebrow: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  heroValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.hero,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.hero,
    marginTop: SPACING.xs,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  metricPill: {
    backgroundColor: NUTRITION_COLORS.light,
    borderRadius: SPACING.lg,
    flexGrow: 1,
    padding: SPACING.md,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  metricValue: {
    color: NUTRITION_COLORS.dark,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  waterCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  waterIcon: {
    alignItems: "center",
    backgroundColor: NUTRITION_COLORS.light,
    borderRadius: SPACING.xl,
    height: SPACING.xxxl + SPACING.xxl,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.xxl,
  },
  waterContent: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  cardTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: TYPOGRAPHY.lineHeights.lg,
  },
  waterValue: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  progressTrack: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.sm,
    height: SPACING.sm,
    marginTop: SPACING.md,
    overflow: "hidden",
  },
  waterFill: {
    backgroundColor: NUTRITION_COLORS.secondary,
    borderRadius: SPACING.sm,
    height: "100%",
  },
  goalText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.sm,
  },
  list: {
    gap: SPACING.md,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  emptyCard: {
    padding: 0,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
});
