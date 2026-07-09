import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  LayoutChangeEvent,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
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
import {
  cancelScheduledReminder,
  getHydrationReminderKey,
  listScheduledReminders,
  scheduleHydrationReminder,
} from "../../services/notifications/reminderScheduler";
import {
  captureFoodPhotoWithCamera,
  pickFoodPhotoFromLibrary,
} from "../../services/media/imagePickerService";
import { getLocalDateKey, useNutritionStore } from "../../store/nutritionStore";
import { COLORS, NUTRITION_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { MacroNutrient, NutritionInsight, NutritionLogEntry, NutritionMeal, NutritionMealType, RootTabParamList } from "../../types";
import type { HealthReminderRecord } from "../../services/notifications/reminderTypes";
import type { FoodScanImageDraft } from "../../services/media/mediaTypes";
import { getNutritionInsightToneColors, getNutritionMacroToneColors } from "../../utils/tone";

const nutritionTabs = ["Personalized Plan", "Ayurveda", "Recipes"] as const;
type NutritionTab = (typeof nutritionTabs)[number];
type NutritionScreenProps = BottomTabScreenProps<RootTabParamList, "Nutrition">;

const AI_MEAL_PLAN_PROMPT = "Create a simple meal plan for today based on my nutrition goals and today's logged meals. Keep it practical and wellness-focused.";

const getMacro = (macros: MacroNutrient[], id: string): MacroNutrient | undefined =>
  macros.find((macro) => macro.id === id);

type MealFormState = {
  mealType: NutritionMealType;
  title: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
};

const mealTypeOptions: Array<{ id: NutritionMealType; label: string }> = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
];

const emptyMealForm: MealFormState = {
  mealType: "breakfast",
  title: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  notes: "",
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

const parseOptionalAmount = (value: string): number | undefined => {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const parseRequiredAmount = (value: string): number | null => {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const mealTypeIcon = (mealType: NutritionMealType): NutritionMeal["iconName"] => {
  if (mealType === "breakfast") return "sunny-outline";
  if (mealType === "lunch") return "restaurant-outline";
  if (mealType === "dinner") return "moon-outline";

  return "cafe-outline";
};

const mealTypeLabel = (mealType: NutritionMealType): string =>
  mealTypeOptions.find((option) => option.id === mealType)?.label ?? "Meal";

const formFromMeal = (meal: NutritionLogEntry): MealFormState => ({
  mealType: meal.mealType,
  title: meal.title,
  calories: `${meal.calories}`,
  protein: meal.protein === undefined ? "" : `${meal.protein}`,
  carbs: meal.carbs === undefined ? "" : `${meal.carbs}`,
  fat: meal.fat === undefined ? "" : `${meal.fat}`,
  notes: meal.notes ?? "",
});

const loggedMealToCardMeal = (meal: NutritionLogEntry): NutritionMeal => {
  const macros = [
    meal.protein !== undefined ? `${meal.protein}g protein` : "",
    meal.carbs !== undefined ? `${meal.carbs}g carbs` : "",
    meal.fat !== undefined ? `${meal.fat}g fat` : "",
  ].filter(Boolean);
  const detail = [
    mealTypeLabel(meal.mealType),
    macros.length > 0 ? macros.join(" - ") : "",
    meal.notes,
  ].filter(Boolean).join(" - ");

  return {
    id: meal.id,
    name: meal.title,
    detail,
    calories: meal.calories,
    iconName: mealTypeIcon(meal.mealType),
  };
};

const macroTotalFor = (meals: NutritionLogEntry[], id: string): number => {
  if (id === "protein") {
    return Math.round(meals.reduce((sum, meal) => sum + (meal.protein ?? 0), 0));
  }

  if (id === "carbs") {
    return Math.round(meals.reduce((sum, meal) => sum + (meal.carbs ?? 0), 0));
  }

  if (id === "fat") {
    return Math.round(meals.reduce((sum, meal) => sum + (meal.fat ?? 0), 0));
  }

  return 0;
};

const buildLocalMacros = (baseMacros: MacroNutrient[], meals: NutritionLogEntry[]): MacroNutrient[] =>
  baseMacros.map((macro) => {
    const consumed = macroTotalFor(meals, macro.id);
    const percent = macro.goal > 0 ? clampPercent(Math.round((consumed / macro.goal) * 100)) : 0;

    return {
      ...macro,
      consumed,
      percent,
    };
  });

const getScoreLabel = (score: number): string => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 45) return "Building";

  return "Needs Logging";
};

const buildLocalInsights = (
  baseInsights: NutritionInsight[],
  caloriesConsumed: number,
  calorieGoal: number,
  hydrationMl: number,
  hydrationGoalMl: number,
  protein?: MacroNutrient,
): NutritionInsight[] =>
  baseInsights.map((insight) => {
    if (insight.id === "calories") {
      const remaining = Math.max(0, calorieGoal - caloriesConsumed);

      return {
        ...insight,
        status: caloriesConsumed > calorieGoal ? "Over Goal" : "On Track",
        detail: caloriesConsumed > calorieGoal
          ? `${caloriesConsumed - calorieGoal} kcal above today's target.`
          : `${remaining} kcal remaining today.`,
      };
    }

    if (insight.id === "hydration") {
      const remainingMl = Math.max(0, hydrationGoalMl - hydrationMl);

      return {
        ...insight,
        status: remainingMl === 0 ? "Goal Met" : "Needs Attention",
        detail: remainingMl === 0
          ? "Hydration goal reached for today."
          : `Drink ${remainingMl} ml more water today.`,
      };
    }

    if (insight.id === "protein" && protein) {
      return {
        ...insight,
        status: protein.percent >= 80 ? "Good" : "Building",
        detail: `${protein.consumed}${protein.unit} logged against ${protein.goal}${protein.unit} goal.`,
      };
    }

    return insight;
  });

export default function NutritionScreen({ navigation }: NutritionScreenProps) {
  const [selectedTab, setSelectedTab] = useState<NutritionTab>("Personalized Plan");
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [mealForm, setMealForm] = useState<MealFormState>(emptyMealForm);
  const [editingMeal, setEditingMeal] = useState<NutritionLogEntry | null>(null);
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const indicatorOffset = useRef(new Animated.Value(0)).current;
  const { data, error, loading } = useHealthData();
  const nutrition = data.nutrition;
  const hydrateNutrition = useNutritionStore((state) => state.hydrate);
  const localMeals = useNutritionStore((state) => state.meals);
  const hydration = useNutritionStore((state) => state.hydration);
  const localNutritionHydrated = useNutritionStore((state) => state.hydrated);
  const addMeal = useNutritionStore((state) => state.addMeal);
  const updateMeal = useNutritionStore((state) => state.updateMeal);
  const deleteMeal = useNutritionStore((state) => state.deleteMeal);
  const addWater = useNutritionStore((state) => state.addWater);
  const [scheduledReminders, setScheduledReminders] = useState<HealthReminderRecord[]>([]);
  const [hydrationReminderBusy, setHydrationReminderBusy] = useState(false);
  const [foodScanDraft, setFoodScanDraft] = useState<FoodScanImageDraft | null>(null);
  const selectedTabIndex = nutritionTabs.indexOf(selectedTab);
  const todayKey = getLocalDateKey();
  const todayMeals = useMemo(
    () => localMeals
      .filter((meal) => meal.dateKey === todayKey)
      .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt)),
    [localMeals, todayKey],
  );
  const hydrationMl = useMemo(
    () => hydration
      .filter((entry) => entry.dateKey === todayKey)
      .reduce((sum, entry) => sum + entry.amountMl, 0),
    [hydration, todayKey],
  );

  useEffect(() => {
    Animated.spring(indicatorOffset, {
      damping: 18,
      mass: 0.8,
      stiffness: 180,
      toValue: selectedTabIndex * segmentWidth,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [indicatorOffset, segmentWidth, selectedTabIndex]);

  useEffect(() => {
    void hydrateNutrition();
  }, [hydrateNutrition]);

  const refreshHydrationReminderState = useCallback(async () => {
    setScheduledReminders(await listScheduledReminders());
  }, []);

  useEffect(() => {
    void refreshHydrationReminderState();
  }, [refreshHydrationReminderState]);

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

  const calorieGoal = nutrition.summary.calorieGoal;
  const waterGoal = nutrition.summary.waterGoal;
  const hydrationGoalMl = waterGoal * 250;
  const caloriesConsumed = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const localMacros = buildLocalMacros(nutrition.macros, todayMeals);
  const waterGlasses = Math.round((hydrationMl / 250) * 10) / 10;
  const calorieProgress = calorieGoal > 0 ? clampPercent(Math.round((caloriesConsumed / calorieGoal) * 100)) : 0;
  const waterProgress = hydrationGoalMl > 0 ? clampPercent(Math.round((hydrationMl / hydrationGoalMl) * 100)) : 0;
  const score = Math.round((calorieProgress * 0.62) + (waterProgress * 0.38));
  const summary = {
    ...nutrition.summary,
    score,
    scoreLabel: getScoreLabel(score),
    caloriesConsumed,
    caloriesRemaining: Math.max(0, calorieGoal - caloriesConsumed),
    waterGlasses,
    waterGoal,
    waterGoalAchieved: hydrationMl >= hydrationGoalMl,
  };
  const localNutrition = {
    ...nutrition,
    summary,
    macros: localMacros,
    meals: todayMeals.map(loggedMealToCardMeal),
    insights: buildLocalInsights(
      nutrition.insights,
      caloriesConsumed,
      calorieGoal,
      hydrationMl,
      hydrationGoalMl,
      getMacro(localMacros, "protein"),
    ),
  };
  const protein = getMacro(localNutrition.macros, "protein");
  const carbs = getMacro(localNutrition.macros, "carbs");
  const fat = getMacro(localNutrition.macros, "fat");
  const macroRows = [protein, carbs, fat].filter((macro): macro is MacroNutrient => Boolean(macro));
  const calorieTone = getNutritionInsightToneColors("calories", "Calories", "primary");
  const waterTone = getNutritionInsightToneColors("hydration", "Hydration", "warning");
  const hydrationReminderKey = getHydrationReminderKey();
  const hydrationReminder = scheduledReminders.find((reminder) => reminder.key === hydrationReminderKey);
  const onTabsLayout = (event: LayoutChangeEvent): void => {
    setSegmentWidth(event.nativeEvent.layout.width / nutritionTabs.length);
  };

  const openAddMeal = (preset?: Partial<MealFormState>) => {
    setEditingMeal(null);
    setMealForm({ ...emptyMealForm, ...preset });
    setMealModalVisible(true);
  };

  const openEditMeal = (meal: NutritionLogEntry) => {
    setEditingMeal(meal);
    setMealForm(formFromMeal(meal));
    setMealModalVisible(true);
  };

  const closeMealModal = () => {
    setMealModalVisible(false);
    setEditingMeal(null);
    setMealForm(emptyMealForm);
  };

  const handleSaveMeal = async () => {
    const title = mealForm.title.trim();
    const calories = parseRequiredAmount(mealForm.calories);

    if (!title) {
      Alert.alert("Meal name needed", "Add a meal name before saving.");
      return;
    }

    if (calories === null) {
      Alert.alert("Calories needed", "Add calories as a number before saving.");
      return;
    }

    const mealInput = {
      mealType: mealForm.mealType,
      title,
      calories,
      protein: parseOptionalAmount(mealForm.protein),
      carbs: parseOptionalAmount(mealForm.carbs),
      fat: parseOptionalAmount(mealForm.fat),
      notes: mealForm.notes,
    };

    if (editingMeal) {
      await updateMeal(editingMeal.id, mealInput);
      Alert.alert("Meal updated", `${title} has been updated.`);
    } else {
      await addMeal(mealInput);
      Alert.alert("Meal logged", `${title} has been added to today's nutrition.`);
    }

    closeMealModal();
  };

  const handleDeleteMeal = (meal: NutritionLogEntry) => {
    Alert.alert("Delete meal", `Remove ${meal.title} from today's log?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteMeal(meal.id).then(() => {
            Alert.alert("Meal deleted", `${meal.title} was removed.`);
          });
        },
      },
    ]);
  };

  const handleAddWater = (amountMl: number) => {
    void addWater(amountMl).then(() => {
      Alert.alert("Hydration updated", `${amountMl} ml water added for today.`);
    });
  };
  const handleHydrationReminder = () => {
    setHydrationReminderBusy(true);
    const action = hydrationReminder
      ? cancelScheduledReminder(hydrationReminderKey).then(() => ({
          title: "Reminder removed",
          message: "The daily hydration reminder was cancelled on this device.",
        }))
      : scheduleHydrationReminder().then((result) => ({
          title: result.ok ? "Reminder scheduled" : "Reminder unavailable",
          message: result.ok ? `Daily hydration reminder set for ${result.record.timeLabel}.` : result.message,
        }));

    void action
      .then(({ title, message }) => {
        Alert.alert(title, message);
      })
      .finally(() => {
        setHydrationReminderBusy(false);
        void refreshHydrationReminderState();
      });
  };
  const beginManualLogFromFoodScan = (draft: FoodScanImageDraft) => {
    openAddMeal({
      title: "Photo meal draft",
      notes: [
        "Photo selected for manual review.",
        `Source: ${draft.source === "camera" ? "Camera" : "Photo library"}.`,
        "AI nutrition recognition is not enabled in this beta build; enter calories and macros yourself.",
      ].join(" "),
    });
  };
  const handleFoodScanResult = (result: Awaited<ReturnType<typeof pickFoodPhotoFromLibrary>>) => {
    if (!result.ok) {
      if (result.reason !== "cancelled") {
        Alert.alert("Food Scan unavailable", result.message);
      }
      return;
    }

    setFoodScanDraft(result.asset);
    Alert.alert(
      "Photo captured",
      "AI nutrition recognition will be added after backend vision validation. Please review and log this meal manually.",
      [
        { text: "Later", style: "cancel" },
        { text: "Log Manually", onPress: () => setTimeout(() => beginManualLogFromFoodScan(result.asset), 0) },
      ],
    );
  };
  const handleFoodScan = () => {
    Alert.alert(
      "Food Scan",
      "Choose a meal photo source. Healthy You will not upload or analyze the image in this beta build.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Camera",
          onPress: () => {
            void captureFoodPhotoWithCamera().then(handleFoodScanResult);
          },
        },
        {
          text: "Photo Library",
          onPress: () => {
            void pickFoodPhotoFromLibrary().then(handleFoodScanResult);
          },
        },
      ],
    );
  };

  const handleNutritionAction = (title: string) => {
    const normalizedTitle = title.toLowerCase();

    if (normalizedTitle.includes("log meal")) {
      openAddMeal();
      return;
    }

    if (normalizedTitle.includes("scan")) {
      handleFoodScan();
      return;
    }

    if (normalizedTitle.includes("ai meal")) {
      navigation.navigate("Chat", { initialPrompt: AI_MEAL_PLAN_PROMPT });
      return;
    }

    Alert.alert(
      title,
      "This nutrition action is not connected in beta yet. Meal logging and hydration tracking are available now.",
    );
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

              {foodScanDraft ? (
                <CustomCard style={styles.foodScanPreviewCard}>
                  <Image
                    accessibilityLabel="Selected food scan photo"
                    source={{ uri: foodScanDraft.uri }}
                    style={styles.foodScanPreviewImage}
                  />
                  <View style={styles.foodScanPreviewCopy}>
                    <Text numberOfLines={1} style={styles.foodScanPreviewTitle}>Food Scan draft</Text>
                    <Text style={styles.foodScanPreviewText}>
                      Photo captured locally. AI recognition is deferred until backend vision validation.
                    </Text>
                    <TouchableOpacity
                      accessibilityLabel="Log scanned meal manually"
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      onPress={() => beginManualLogFromFoodScan(foodScanDraft)}
                      style={styles.foodScanPreviewButton}
                    >
                      <Ionicons color={COLORS.white} name="create-outline" size={16} />
                      <Text style={styles.foodScanPreviewButtonText}>Log Manually</Text>
                    </TouchableOpacity>
                  </View>
                </CustomCard>
              ) : null}

              <DashboardSection title="Macronutrients" />
              {localNutrition.macros.length > 0 ? (
                <View style={styles.macroGrid}>
                  {localNutrition.macros.map((macro) => (
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
                    {hydrationMl} ml ({summary.waterGlasses} / {summary.waterGoal} glasses)
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
                  <View style={styles.hydrationActions}>
                    <TouchableOpacity
                      accessibilityLabel="Add 250 milliliters water"
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      onPress={() => handleAddWater(250)}
                      style={[styles.hydrationButton, { backgroundColor: waterTone.background }]}
                    >
                      <Ionicons color={waterTone.foreground} name="add" size={16} />
                      <Text style={[styles.hydrationButtonText, { color: waterTone.foreground }]}>250 ml</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel="Add 500 milliliters water"
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      onPress={() => handleAddWater(500)}
                      style={[styles.hydrationButton, { backgroundColor: waterTone.background }]}
                    >
                      <Ionicons color={waterTone.foreground} name="add" size={16} />
                      <Text style={[styles.hydrationButtonText, { color: waterTone.foreground }]}>500 ml</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel={hydrationReminder ? "Cancel daily hydration reminder" : "Schedule daily hydration reminder"}
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={hydrationReminderBusy}
                      onPress={handleHydrationReminder}
                      style={[
                        styles.hydrationButton,
                        styles.hydrationReminderButton,
                        hydrationReminder && styles.hydrationReminderCancelButton,
                        hydrationReminderBusy && styles.hydrationReminderDisabled,
                      ]}
                    >
                      <Ionicons
                        color={hydrationReminder ? COLORS.textMuted : COLORS.white}
                        name={hydrationReminder ? "notifications-off-outline" : "notifications-outline"}
                        size={16}
                      />
                      <Text
                        style={[
                          styles.hydrationButtonText,
                          styles.hydrationReminderText,
                          hydrationReminder && styles.hydrationReminderCancelText,
                        ]}
                      >
                        {hydrationReminderBusy
                          ? "Updating..."
                          : hydrationReminder
                            ? `On at ${hydrationReminder.timeLabel}`
                            : "Daily reminder"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <ProgressRing
                  backgroundColor={waterTone.background}
                  color={waterTone.foreground}
                  max={summary.waterGoal}
                  value={summary.waterGlasses}
                />
              </CustomCard>

              <DashboardSection title="Today's Meals" actionLabel="Add" onPress={openAddMeal} />
              {localNutrition.meals.length > 0 ? (
                <View style={styles.list}>
                  {todayMeals.map((meal) => {
                    const cardMeal = loggedMealToCardMeal(meal);

                    return (
                      <NutritionMealCard
                        key={meal.id}
                        meal={cardMeal}
                        onDelete={() => handleDeleteMeal(meal)}
                        onEdit={() => openEditMeal(meal)}
                      />
                    );
                  })}
                </View>
              ) : (
                <CustomCard style={styles.emptyCard}>
                  <EmptyState
                    icon="restaurant-outline"
                    loading={!localNutritionHydrated}
                    subtitle="Use Log Meal to add breakfast, lunch, dinner, or snacks for today."
                    title={localNutritionHydrated ? "No meals logged today" : "Loading meal log"}
                  />
                </CustomCard>
              )}

              <DashboardSection title="Nutrition Insights" />
              {localNutrition.insights.length > 0 ? (
                <View style={styles.list}>
                  {localNutrition.insights.map((insight) => (
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
              {localNutrition.actions.length > 0 ? (
                <View style={styles.actionsGrid}>
                  {localNutrition.actions.map((action) => (
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
                  value={`${hydrationMl} ml`}
                />
              </View>
            </>
          ) : null}

          {selectedTab === "Ayurveda" ? <AyurvedaSection /> : null}
          {selectedTab === "Recipes" ? <FoodEducationSection /> : null}
        </ScreenSheet>

        <Modal
          animationType="slide"
          onRequestClose={closeMealModal}
          transparent
          visible={mealModalVisible}
        >
          <View style={styles.modalBackdrop}>
            <CustomCard style={styles.mealFormSheet}>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.formTitle}>{editingMeal ? "Edit Meal" : "Log Meal"}</Text>
                  <Text style={styles.formSubtitle}>Saved locally for {todayKey}</Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Close meal form"
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  onPress={closeMealModal}
                  style={styles.closeButton}
                >
                  <Ionicons color={COLORS.text} name="close" size={20} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.formContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.inputLabel}>Meal type</Text>
                <View style={styles.mealTypeGrid}>
                  {mealTypeOptions.map((option) => {
                    const active = mealForm.mealType === option.id;

                    return (
                      <TouchableOpacity
                        accessibilityLabel={option.label}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        key={option.id}
                        onPress={() => setMealForm((current) => ({ ...current, mealType: option.id }))}
                        style={[styles.mealTypeButton, active && styles.mealTypeButtonActive]}
                      >
                        <Text style={[styles.mealTypeText, active && styles.mealTypeTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>Meal name</Text>
                <TextInput
                  accessibilityLabel="Meal name"
                  onChangeText={(title) => setMealForm((current) => ({ ...current, title }))}
                  placeholder="Paneer rice bowl"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                  value={mealForm.title}
                />

                <Text style={styles.inputLabel}>Calories</Text>
                <TextInput
                  accessibilityLabel="Meal calories"
                  inputMode="numeric"
                  keyboardType="numeric"
                  onChangeText={(calories) => setMealForm((current) => ({ ...current, calories }))}
                  placeholder="520"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                  value={mealForm.calories}
                />

                <View style={styles.nutrientGrid}>
                  <View style={styles.nutrientInput}>
                    <Text style={styles.inputLabel}>Protein g</Text>
                    <TextInput
                      accessibilityLabel="Protein grams"
                      inputMode="decimal"
                      keyboardType="decimal-pad"
                      onChangeText={(proteinValue) => setMealForm((current) => ({ ...current, protein: proteinValue }))}
                      placeholder="25"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                      value={mealForm.protein}
                    />
                  </View>
                  <View style={styles.nutrientInput}>
                    <Text style={styles.inputLabel}>Carbs g</Text>
                    <TextInput
                      accessibilityLabel="Carbs grams"
                      inputMode="decimal"
                      keyboardType="decimal-pad"
                      onChangeText={(carbsValue) => setMealForm((current) => ({ ...current, carbs: carbsValue }))}
                      placeholder="60"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                      value={mealForm.carbs}
                    />
                  </View>
                  <View style={styles.nutrientInput}>
                    <Text style={styles.inputLabel}>Fat g</Text>
                    <TextInput
                      accessibilityLabel="Fat grams"
                      inputMode="decimal"
                      keyboardType="decimal-pad"
                      onChangeText={(fatValue) => setMealForm((current) => ({ ...current, fat: fatValue }))}
                      placeholder="18"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                      value={mealForm.fat}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  accessibilityLabel="Meal notes"
                  multiline
                  onChangeText={(notes) => setMealForm((current) => ({ ...current, notes }))}
                  placeholder="Optional notes"
                  placeholderTextColor={COLORS.textMuted}
                  style={[styles.input, styles.notesInput]}
                  value={mealForm.notes}
                />

                <TouchableOpacity
                  accessibilityLabel={editingMeal ? "Save meal changes" : "Save meal"}
                  accessibilityRole="button"
                  activeOpacity={0.86}
                  onPress={() => void handleSaveMeal()}
                  style={styles.saveMealButton}
                >
                  <Ionicons color={COLORS.white} name="checkmark" size={18} />
                  <Text style={styles.saveMealText}>{editingMeal ? "Save Changes" : "Log Meal"}</Text>
                </TouchableOpacity>
              </ScrollView>
            </CustomCard>
          </View>
        </Modal>
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
  foodScanPreviewCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    padding: SPACING.md,
  },
  foodScanPreviewImage: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.md,
    height: 86,
    width: 86,
  },
  foodScanPreviewCopy: {
    flex: 1,
    gap: SPACING.xs,
    minWidth: SPACING.cardMinWidth,
  },
  foodScanPreviewTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  foodScanPreviewText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
  },
  foodScanPreviewButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: NUTRITION_COLORS.secondary,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    minHeight: 34,
    paddingHorizontal: SPACING.md,
  },
  foodScanPreviewButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  goalText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.sm,
  },
  hydrationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  hydrationButton: {
    alignItems: "center",
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    minHeight: 38,
    paddingHorizontal: SPACING.md,
  },
  hydrationButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  hydrationReminderButton: {
    backgroundColor: NUTRITION_COLORS.secondary,
  },
  hydrationReminderCancelButton: {
    backgroundColor: COLORS.surfaceMuted,
  },
  hydrationReminderDisabled: {
    opacity: 0.58,
  },
  hydrationReminderText: {
    color: COLORS.white,
  },
  hydrationReminderCancelText: {
    color: COLORS.textMuted,
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
  modalBackdrop: {
    backgroundColor: "rgba(20, 13, 53, 0.32)",
    flex: 1,
    justifyContent: "flex-end",
    padding: SPACING.lg,
  },
  mealFormSheet: {
    maxHeight: "88%",
    padding: SPACING.lg,
  },
  formHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  formSubtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  formContent: {
    paddingTop: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  mealTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  mealTypeButton: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 42,
    minWidth: 118,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  mealTypeButtonActive: {
    backgroundColor: NUTRITION_COLORS.light,
    borderColor: NUTRITION_COLORS.secondary,
  },
  mealTypeText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
  },
  mealTypeTextActive: {
    color: NUTRITION_COLORS.dark,
  },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  nutrientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  nutrientInput: {
    flex: 1,
    minWidth: 96,
  },
  notesInput: {
    minHeight: 82,
    textAlignVertical: "top",
  },
  saveMealButton: {
    alignItems: "center",
    backgroundColor: NUTRITION_COLORS.secondary,
    borderRadius: 18,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    marginTop: SPACING.lg,
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
  },
  saveMealText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
});
