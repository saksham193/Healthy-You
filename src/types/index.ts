import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { PredictionSummary } from "../services/prediction/PredictionTypes";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export type RootTabParamList = {
  Chat: { initialPrompt?: string } | undefined;
  Nutrition: undefined;
  Fitness: undefined;
  Data: undefined;
  Schedule: undefined;
  Profile: undefined;
};

export type Tone = "primary" | "accent" | "warning" | "danger";

export type HealthSummary = {
  id: string;
  title: string;
  value: string;
  suffix: string;
  iconName: IconName;
  tone: Tone;
};

export type HomeFeature = {
  id: string;
  title: string;
  subtitle: string;
  iconName: IconName;
  tone: Tone;
};

export type NutritionSummary = {
  score: number;
  scoreLabel: string;
  caloriesConsumed: number;
  calorieGoal: number;
  caloriesRemaining: number;
  waterGlasses: number;
  waterGoal: number;
  waterGoalAchieved: boolean;
};

export type MacroNutrient = {
  id: string;
  name: string;
  consumed: number;
  goal: number;
  unit: string;
  percent: number;
  iconName: IconName;
  tone: Tone;
};

export type NutritionMeal = {
  id: string;
  name: string;
  calories: number;
  detail: string;
  iconName: IconName;
};

export type NutritionInsight = {
  id: string;
  title: string;
  status: string;
  detail: string;
  iconName: IconName;
  tone: Tone;
};

export type NutritionAction = {
  id: string;
  title: string;
  iconName: IconName;
  tone: Tone;
};

export type NutritionMealType = "breakfast" | "lunch" | "dinner" | "snack";

export type NutritionLogEntry = {
  id: string;
  mealType: NutritionMealType;
  title: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  notes?: string;
  loggedAt: string;
  dateKey: string;
};

export type HydrationLogEntry = {
  id: string;
  amountMl: number;
  loggedAt: string;
  dateKey: string;
};

export type FitnessSummary = {
  score: number;
  scoreLabel: string;
  weeklyActivityMinutes: number;
  weeklyTrend: string;
  caloriesBurned: number;
  calorieGoal: number;
  caloriesRemaining: number;
  workoutProgress: number;
  workoutsCompleted: number;
  workoutsTotal: number;
  height: string;
  weight: string;
  bmi: number;
  bmiStatus: string;
  steps: number;
  stepGoal: number;
  stepProgress: number;
};

export type WeeklyActivityPoint = {
  day: string;
  minutes: number;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  duration: string;
  difficulty: string;
  status: "completed" | "active" | "pending";
  iconName: IconName;
  tone: Tone;
  category?: "strength" | "cardio" | "mobility" | "recovery" | "custom";
  durationMinutes?: number;
  intensity?: "low" | "moderate" | "high";
  bodyFocus?: string[];
  equipment?: string;
  notes?: string;
  userRestrictions?: string[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FitnessWorkoutCompletionEntry = {
  id: string;
  workoutId: string;
  workoutName: string;
  categoryId: string;
  categoryTitle: string;
  durationMinutes: number;
  estimatedCalories: number;
  difficulty: string;
  completedAt: string;
  dateKey: string;
  intensity?: "low" | "moderate" | "high";
  notes?: string;
};

export type FitnessPreferences = {
  bodyType?: string;
  goals: string[];
  limitations: string[];
  restrictionNotes?: string;
  hideRestrictedWorkouts: boolean;
  updatedAt: string;
};

export type ExerciseCategory = {
  id: string;
  title: string;
  description: string;
  iconName: IconName;
  tone: Tone;
};

export type RecoveryInsight = {
  id: string;
  title: string;
  status: string;
  detail: string;
  iconName: IconName;
  tone: Tone;
};

export type FitnessAction = {
  id: string;
  title: string;
  iconName: IconName;
  tone: Tone;
};

export type MedibotPrompt = {
  id: string;
  label: string;
};

export type MedibotAction = {
  id: string;
  title: string;
  iconName: IconName;
  tone: Tone;
};

export type ConversationHistory = {
  id: string;
  group: "Today" | "Yesterday" | "Last Week";
  title: string;
  iconName: IconName;
  tone: Tone;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  message: string;
  metadata?: AIResponseMetadata;
};

export type SleepInsight = {
  id: string;
  title: string;
  value: string;
  detail: string;
};

export type ScheduleSummary = {
  completedTasks: number;
  totalTasks: number;
  remainingTasks: number;
  completionPercent: number;
  waterGlasses: number;
  waterGoal: number;
};

export type TimelineStatus = "completed" | "upcoming" | "missed";

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  iconName: IconName;
  status: TimelineStatus;
};

export type MedicationStatus = "completed" | "pending";

export type MedicationReminder = {
  id: string;
  name: string;
  dosage: string;
  time: string;
  status: MedicationStatus;
};

export type Appointment = {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  iconName: IconName;
};

export type Habit = {
  id: string;
  title: string;
  streak: string;
  completed: boolean;
  iconName: IconName;
  tone: Tone;
};

export type HabitCompletionEntry = {
  id: string;
  habitId: string;
  habitTitle: string;
  category?: string;
  completedAt: string;
  dateKey: string;
  streakLabel?: string;
};

export type MedicationLogStatus = "taken" | "skipped";

export type MedicationLogEntry = {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage?: string;
  scheduledTime?: string;
  status: MedicationLogStatus;
  loggedAt: string;
  dateKey: string;
};

export type CustomHealthRoutineType = "medication" | "habit";

export type CustomHealthRoutine = {
  id: string;
  type: CustomHealthRoutineType;
  name: string;
  notes?: string;
  doseLabel?: string;
  reminderEnabled: boolean;
  reminderTime?: string;
  reminderNotificationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SleepSchedule = {
  bedtime: string;
  wakeTime: string;
  goalHours: number;
  plannedHours: number;
  progressPercent: number;
};

export type ScheduleAction = {
  id: string;
  title: string;
  iconName: IconName;
  tone: Tone;
};

export type ScheduleAdherence = {
  labels: string[];
  values: number[];
};

export type ProfileSummary = {
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  healthScore: number;
  healthStatus: HealthScoreStatus;
  monthlyChange: string;
};

export type BodyMetric = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  iconName: IconName;
  tone: Tone;
};

export type VitalMetric = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  iconName: IconName;
  tone: Tone;
};

export type HealthGoal = {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  iconName: IconName;
  tone: Tone;
};

export type MedicalInfo = {
  id: string;
  label: string;
  value: string;
  iconName: IconName;
  tone: Tone;
};

export type ConnectedDevice = {
  id: string;
  name: string;
  detail: string;
  status: "Connected" | "Disconnected";
  iconName: IconName;
};

export type HealthScoreStatus = "Excellent" | "Good" | "Fair" | "Needs Improvement";

export type HealthScore = {
  score: number;
  status: HealthScoreStatus;
  change: string;
};

export type DeviceSyncStatus = "idle" | "syncing" | "synced" | "error";

export type ProfileSyncStatus = "idle" | "syncing" | "synced" | "pending" | "offline" | "failed";

export type HealthBackupStatus = "idle" | "syncing" | "synced" | "pending" | "offline" | "failed";

export type HealthSummaryBackup = {
  id: string;
  date: string;
  source: "health_connect" | "apple_health" | "mock_health" | "cloud_summary" | "manual";
  deviceSource: "live" | "cache" | "fallback" | "no_data" | "cloud_summary" | "unavailable";
  displaySource: "Live Device Summary" | "Cloud Summary" | "Last synced summary" | "Historical summary";
  summaryType: "daily";
  metrics: {
    steps?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
    sleepMinutes?: number;
    hydrationMl?: number;
    heartRateAvg?: number;
  };
  scores: {
    healthScore?: number;
    sleepScore?: number;
    fitnessScore?: number;
  };
  syncMetadata: {
    lastDeviceSyncAt: string | null;
    provider?: ConnectedHealthDevice["provider"] | "cloud_summary";
    status: "live" | "cache" | "fallback" | "no_data" | "cloud_summary" | "unavailable";
  };
  updatedAt: string;
};

export type ConnectedHealthDevice = ConnectedDevice & {
  provider: "Apple Watch" | "Apple Health" | "Google Fit" | "Samsung Health" | "Fitbit" | "Health Connect" | "Mock Health";
  lastSyncedAt: string | null;
  syncStatus: DeviceSyncStatus;
};

export type NutritionData = {
  summary: NutritionSummary;
  macros: MacroNutrient[];
  meals: NutritionMeal[];
  insights: NutritionInsight[];
  actions: NutritionAction[];
};

export type FitnessData = {
  summary: FitnessSummary;
  weeklyActivity: WeeklyActivityPoint[];
  workoutPlans: WorkoutPlan[];
  exerciseCategories: ExerciseCategory[];
  recoveryInsights: RecoveryInsight[];
  actions: FitnessAction[];
};

export type SleepData = {
  insights: SleepInsight[];
  schedule: SleepSchedule;
};

export type MedicationData = {
  reminders: MedicationReminder[];
  adherence: ScheduleAdherence;
};

export type VitalsData = {
  healthSummaries: HealthSummary[];
  homeFeatures: HomeFeature[];
  bodyMetrics: BodyMetric[];
  vitalMetrics: VitalMetric[];
  bloodPressurePoints: number[];
  glucosePoints: number[];
  labels: string[];
};

export type ScheduleData = {
  summary: ScheduleSummary;
  timelineEvents: TimelineEvent[];
  medications: MedicationReminder[];
  appointments: Appointment[];
  habits: Habit[];
  sleepSchedule: SleepSchedule;
  adherenceData: ScheduleAdherence;
  actions: ScheduleAction[];
};

export type ProfileData = {
  summary: ProfileSummary;
  bodyMetrics: BodyMetric[];
  vitalMetrics: VitalMetric[];
  healthGoals: HealthGoal[];
  medicalInfo: MedicalInfo[];
  emergencyContacts: EmergencyContact[];
  achievements: Achievement[];
  actions: ProfileAction[];
};

export type AssistantData = {
  prompts: MedibotPrompt[];
  quickActions: MedibotAction[];
  history: ConversationHistory[];
  conversation: ConversationMessage[];
};

export type AIIntent =
  | "nutrition"
  | "fitness"
  | "sleep"
  | "medication"
  | "hydration"
  | "general"
  | "steps_query"
  | "heart_rate_query"
  | "sleep_query"
  | "calories_query"
  | "hydration_query"
  | "activity_query"
  | "device_sync_query"
  | "health_score_query"
  | "daily_briefing"
  | "general_wellness"
  | "medical_safety";

export type ProfileSource = "store" | "memory" | "manual";

export type PersonalHealthProfile = {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  demographics: {
    age?: number;
    gender?: string;
  };
  bodyMetrics: {
    height?: number;
    weight?: number;
    bmi?: number;
  };
  goals: string[];
  dietaryPreferences: string[];
  allergies: string[];
  chronicConditions: string[];
  medications?: string[];
  preferences?: Record<string, unknown>;
  activityLevel?: string;
  averageSleepHours?: number;
  medicationAdherence?: number;
  wearableMetadata?: {
    primaryProvider?: ConnectedHealthDevice["provider"];
    connectedDeviceCount: number;
    capabilities: string[];
    lastSyncedAt: string | null;
    syncStatus: DeviceSyncStatus;
  };
  activityProfile?: {
    dailySteps?: number;
    stepGoal?: number;
    weeklyActivityMinutes?: number;
    exerciseMinutes?: number;
    caloriesBurned?: number;
  };
  restProfile?: {
    sleepMinutes?: number;
    sleepScore?: number;
    plannedSleepHours?: number;
  };
  recoveryProfile?: {
    heartRateBpm?: number;
    recoveryStatus?: string;
  };
  profileCompletenessScore: number;
  updatedAt: string;
  source: ProfileSource;
};

export type PartialPersonalHealthProfile = {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  demographics?: Partial<PersonalHealthProfile["demographics"]>;
  bodyMetrics?: Partial<PersonalHealthProfile["bodyMetrics"]>;
  goals?: string[];
  dietaryPreferences?: string[];
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  preferences?: Record<string, unknown>;
  activityLevel?: string;
  averageSleepHours?: number;
  medicationAdherence?: number;
  wearableMetadata?: PersonalHealthProfile["wearableMetadata"];
  activityProfile?: PersonalHealthProfile["activityProfile"];
  restProfile?: PersonalHealthProfile["restProfile"];
  recoveryProfile?: PersonalHealthProfile["recoveryProfile"];
  source?: ProfileSource;
};

export type MemoryCategory =
  | "goal"
  | "dietary_preference"
  | "allergy"
  | "health_concern"
  | "medication_habit"
  | "exercise_preference"
  | "recurring_topic"
  | "important_recommendation";

export type MemoryRecord = {
  id: string;
  category: MemoryCategory;
  value: string;
  sourceMessage: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  content?: string;
  summary?: string;
  type?: MemoryCategory | "profile" | "preference" | "habit" | "conversation" | "health" | "nutrition" | "fitness" | "medication" | "sleep" | "other";
  source?: "conversation" | "manual" | "profile" | "device" | "import";
  importance?: number;
  metadata?: Record<string, unknown>;
  embedding?: number[] | null;
};

export type MemoryInput = Omit<MemoryRecord, "id" | "createdAt" | "updatedAt">;

export type MemorySearchOptions = {
  categories?: MemoryCategory[];
  limit?: number;
  query?: string;
};

export type TrendMetric =
  | "weight"
  | "sleep"
  | "calories"
  | "water"
  | "steps"
  | "medicationAdherence";

export type TrendPeriod = "7d" | "30d" | "90d";

export type TrendDirection = "improving" | "stable" | "declining";

export type HealthTrendPoint = {
  date: string;
  value: number;
};

export type HealthTrend = {
  metric: TrendMetric;
  period: TrendPeriod;
  direction: TrendDirection;
  percentageChange: number;
  averageValue: number;
  latestValue: number;
  riskIndicators: string[];
  points: HealthTrendPoint[];
};

export type TrendInsight = {
  id: string;
  metric: TrendMetric;
  period: TrendPeriod;
  severity: "positive" | "neutral" | "attention";
  message: string;
};

export type TrendIntelligenceMetric =
  | "steps"
  | "activity_minutes"
  | "calories_burned"
  | "sleep_minutes"
  | "hydration_ml"
  | "heart_rate_avg"
  | "health_score";

export type TrendIntelligenceDirection = "improving" | "declining" | "stable" | "insufficient_data";

export type TrendIntelligenceConfidence = "low" | "medium" | "high";

export type TrendIntelligenceDataQuality = "fresh" | "stale" | "limited" | "insufficient";

export type HabitDriftType =
  | "activity_drop"
  | "sleep_below_baseline"
  | "hydration_below_baseline"
  | "weekly_activity_drop"
  | "recovery_strain";

export type HabitDriftSignal = {
  id: string;
  type: HabitDriftType;
  metric: TrendIntelligenceMetric;
  severity: "low" | "medium" | "high";
  message: string;
  daysObserved: number;
  confidence: TrendIntelligenceConfidence;
  reason: string;
};

export type TrendIntelligenceItem = {
  id: string;
  metric: TrendIntelligenceMetric;
  label: string;
  direction: TrendIntelligenceDirection;
  period: "7d";
  latestValue?: number;
  baselineValue?: number;
  percentageChange: number;
  confidence: TrendIntelligenceConfidence;
  dataPointsUsed: number;
  dataQuality: TrendIntelligenceDataQuality;
  source: "local_summary" | "device_cache" | "current_context" | "mixed";
  reason: string;
  interpretation: string;
  abnormalChange: boolean;
  habitDrift: boolean;
};

export type TrendIntelligenceSummary = {
  generatedAt: string;
  source: "local" | "offline_cache" | "mixed";
  weeklySummary: string;
  compactSummary: string[];
  topTrends: TrendIntelligenceItem[];
  metrics: TrendIntelligenceItem[];
  habitDrifts: HabitDriftSignal[];
  confidence: TrendIntelligenceConfidence;
  dataQuality: TrendIntelligenceDataQuality;
};

export type GoalDomain =
  | "activity"
  | "sleep"
  | "hydration"
  | "nutrition"
  | "medication_adherence"
  | "recovery"
  | "general_wellness";

export type CoachingConfidence = "low" | "medium" | "high";

export type CoachingGoal = {
  id: string;
  domain: GoalDomain;
  title: string;
  targetValue?: number;
  unit?: string;
  cadence: "daily" | "weekly" | "monthly";
  baselineValue?: number;
  currentValue?: number;
  progressPercent: number;
  difficulty: "easy" | "moderate" | "challenging";
  status: "active" | "completed" | "paused" | "at_risk";
  confidence: CoachingConfidence;
  reason: string;
  updatedAt: string;
};

export type CoachingHabit = {
  id: string;
  domain: GoalDomain;
  title: string;
  streakDays: number;
  completionRate: number;
  lastCompletedAt?: string;
  status: "building" | "consistent" | "slipping" | "paused";
  confidence: CoachingConfidence;
  cue?: string;
  suggestedNextAction?: string;
  updatedAt: string;
};

export type CoachingRecommendation = {
  id: string;
  domain: GoalDomain;
  message: string;
  reason: string;
  priority: "low" | "medium" | "high";
  confidence: CoachingConfidence;
  source: "goal" | "habit" | "trend" | "profile" | "memory";
};

export type GoalHabitCoachingSummary = {
  generatedAt: string;
  source: "local" | "offline_cache";
  goals: CoachingGoal[];
  habits: CoachingHabit[];
  recommendations: CoachingRecommendation[];
  compactSummary: string[];
  progressScore: number;
  atRiskCount: number;
  confidence: CoachingConfidence;
  dataQuality: TrendIntelligenceDataQuality;
  suggestedNextAction?: string;
};

export type AIHealthInsightCategory =
  | "activity"
  | "sleep"
  | "hydration"
  | "nutrition"
  | "recovery"
  | "medication"
  | "device_data"
  | "general_wellness";

export type AIHealthInsight = {
  id: string;
  category: AIHealthInsightCategory;
  title: string;
  summary: string;
  priority: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  source: "live" | "cached" | "cloud_summary" | "local_summary" | "demo" | "mixed";
  supportingSignals: string[];
  explanation: string;
  suggestedAction: string;
  safetyLevel: "normal" | "caution" | "urgent";
  createdAt: string;
};

export type AIInsightSummary = {
  generatedAt: string;
  source: "local" | "offline_cache" | "mixed";
  topInsights: AIHealthInsight[];
  allInsights: AIHealthInsight[];
  compactSummary: string[];
  confidence: "low" | "medium" | "high";
  dataQuality: TrendIntelligenceDataQuality;
};

export type DailyHealthBriefing = {
  id: string;
  date: string;
  title: string;
  greeting: string;
  summary: string;
  topInsight?: string;
  focusArea?: string;
  goalStatus?: string;
  habitStatus?: string;
  trendHighlight?: string;
  recommendedActions: string[];
  dataSourceNote: string;
  confidence: "low" | "medium" | "high";
  safetyLevel: "normal" | "caution" | "urgent";
  generatedAt: string;
};

export type DailyInsightType =
  | "morning_summary"
  | "health_win"
  | "risk_alert"
  | "personalized_suggestion"
  | "goal_progress";

export type DailyInsight = {
  id: string;
  type: DailyInsightType;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
};

export type PersonalizedRecommendation = {
  id: string;
  intent: AIIntent;
  message: string;
  reason: string;
  priority: "low" | "medium" | "high";
};

export type RecommendationCategory =
  | "activity"
  | "sleep"
  | "hydration"
  | "nutrition"
  | "recovery"
  | "medication"
  | "device_data"
  | "general_wellness";

export type RecommendationSource =
  | "briefing"
  | "insight"
  | "goal"
  | "habit"
  | "trend"
  | "prediction"
  | "prevention"
  | "device"
  | "memory"
  | "agent"
  | "fallback";

export type RecommendationCandidate = {
  id: string;
  title: string;
  summary: string;
  category: RecommendationCategory;
  source: RecommendationSource;
  supportingSources?: RecommendationSource[];
  priority: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  action: string;
  reason: string;
  safetyLevel: "normal" | "caution" | "urgent";
  dedupeKey: string;
  createdAt: string;
};

export type RecommendationDecision = {
  id: string;
  primary: RecommendationCandidate;
  alternatives: RecommendationCandidate[];
  suppressed: RecommendationCandidate[];
  rankingReason: string;
  confidence: "low" | "medium" | "high";
  generatedAt: string;
};

export type CoachingStyle = "friendly" | "motivational" | "professional" | "scientific" | "minimal";

export type PreferredResponseLength = "minimal" | "concise" | "detailed";

export type LearnedPreference = {
  id: string;
  key: string;
  label: string;
  value: string;
  confidence: number;
  evidenceCount: number;
  source: "conversation" | "behavior" | "profile" | "device";
  updatedAt: string;
};

export type PersonalizationSignal = {
  id: string;
  label: string;
  value: string | number;
  confidence: number;
};

export type UserIntelligenceProfile = {
  generatedAt: string;
  fitnessLevel: string;
  activityPattern: string;
  sleepPattern: string;
  hydrationPattern: string;
  nutritionPattern: string;
  stressPattern: string;
  motivationStyle: string;
  preferredCoachingStyle: CoachingStyle;
  preferredResponseLength: PreferredResponseLength;
  healthGoals: string[];
  riskFactors: string[];
  behaviorConfidence: number;
  learningConfidence: number;
  personalizationScore: number;
  learnedPreferences: LearnedPreference[];
  signals: PersonalizationSignal[];
};

export type PreventiveRiskCategory =
  | "sleep"
  | "activity"
  | "hydration"
  | "recovery"
  | "habit"
  | "device_quality"
  | "general";

export type PreventiveRiskSeverity = "low" | "medium" | "high";

export type PreventiveRiskConfidence = "low" | "medium" | "high";

export type PreventiveRiskSource =
  | "trend"
  | "prediction"
  | "briefing"
  | "recommendation"
  | "insight"
  | "goal"
  | "habit"
  | "device";

export type PreventiveRisk = {
  id: string;
  category: PreventiveRiskCategory;
  severity: PreventiveRiskSeverity;
  confidence: PreventiveRiskConfidence;
  title: string;
  summary: string;
  explanation: string;
  suggestedAction: string;
  supportingSignals: string[];
  source: PreventiveRiskSource;
  safetyLevel: "normal" | "caution";
  generatedAt: string;
};

export type PreventiveHealthSummary = {
  generatedAt: string;
  overallRisk: "low" | "medium" | "high";
  primaryRisk?: PreventiveRisk;
  focus: PreventiveRiskCategory | "none";
  confidence: PreventiveRiskConfidence;
  topActions: string[];
  risks: PreventiveRisk[];
  compactSummary: string[];
  safetyLevel: "normal" | "caution";
};

export type AIContext = {
  healthScore: number;
  nutritionScore: number;
  fitnessScore: number;
  sleepScore: number;
  adherenceScore: number;
  nutritionStatus: string;
  fitnessStatus: string;
  sleepStatus: string;
  medicationAdherenceStatus: string;
  hydrationStatus: string;
  hydrationGlasses: number;
  hydrationGoal: number;
  steps: number;
  stepGoal: number;
  weeklyActivityMinutes: number;
  heartRateBpm?: number;
  sleepMinutes?: number;
  caloriesBurned?: number;
  activeMinutes?: number;
  sleepQuality?: string;
  stepPercent?: number;
  deviceDataSource: "live" | "cache" | "fallback" | "demo" | "no_data" | "unavailable";
  deviceDataStatus:
    | "connected_live"
    | "connected_cached"
    | "connected_no_data"
    | "demo"
    | "fallback"
    | "unavailable";
  devicePermissionStatus?: "unknown" | "unavailable" | "granted" | "partial" | "denied";
  lastDeviceSyncAt: string | null;
  currentHealthData: {
    healthScore: number;
    nutritionScore: number;
    fitnessScore: number;
    sleepScore: number;
    medicationAdherence: number;
    hydrationGlasses: number;
    hydrationGoal: number;
    steps: number;
    stepGoal: number;
    weeklyActivityMinutes: number;
    heartRateBpm?: number;
    sleepMinutes?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
    sleepQuality?: string;
    stepPercent?: number;
  };
  profile: PersonalHealthProfile;
  memory: MemoryRecord[];
  trends: HealthTrend[];
  trendIntelligence: TrendIntelligenceSummary;
  goalHabitCoaching: GoalHabitCoachingSummary;
  aiInsights: AIInsightSummary;
  dailyBriefing: DailyHealthBriefing;
  recommendationDecision: RecommendationDecision;
  preventiveSummary: PreventiveHealthSummary;
  insights: DailyInsight[];
  personalizedRecommendations: PersonalizedRecommendation[];
  intelligenceProfile: UserIntelligenceProfile;
  predictions: PredictionSummary;
};

export type AIRequest = {
  message: string;
  intent: AIIntent;
  context: AIContext;
  prompt: string;
  conversation: ConversationMemoryItem[];
  traceId?: string;
};

export type AIOrchestrationContext = {
  profile: PersonalHealthProfile;
  memories: MemoryRecord[];
  trends: HealthTrend[];
  insights: DailyInsight[];
  recommendations: PersonalizedRecommendation[];
  conversation: ConversationMemoryItem[];
};

export type AIResponse = {
  id: string;
  intent: AIIntent;
  response: string;
  suggestions: string[];
  provider: "mock" | "openai" | "offline";
  metadata?: AIResponseMetadata;
};

export type ProviderResponse = AIResponse;

export type ProviderError = {
  provider: "mock" | "openai" | "offline";
  message: string;
  recoverable: boolean;
};

export type AIResponseMetadata = {
  offline?: boolean;
  fallback?: boolean;
  cachedResponseUsed?: boolean;
  safetyLevel?: "routine" | "caution" | "urgent" | "limited" | "wellness" | "out_of_scope";
  confidence?: "low" | "medium" | "high";
  source?: "cloud" | "offline" | "mock";
  citations?: MedicalKnowledgeCitation[];
  ragUsed?: boolean;
  retrievalConfidence?: "low" | "medium" | "high";
  knowledgeCategories?: string[];
  retrievalReason?: string;
  topMatches?: Array<{
    chunkId: string;
    title: string;
    score: number;
    reason: string;
  }>;
  governance?: {
    groundingFlags: string[];
    grounded: boolean;
    responseGoverned: boolean;
    citationCount: number;
  };
  traceId?: string;
  providerRequestId?: string;
  evaluation?: {
    qualityScore: number;
    groundingScore: number;
    citationScore: number;
    safetyScore: number;
    latencyScore: number;
    confidenceScore: number;
    overallScore: number;
  };
  versions?: {
    promptVersion: string;
    ragVersion: string;
    knowledgeVersion: string;
    providerVersion: string;
    responseVersion: string;
  };
  agentsUsed?: string[];
  orchestratorVersion?: string;
  coordinationMode?: "single" | "parallel" | "sequential" | "consensus";
  agentConfidence?: "low" | "medium" | "high";
  agentLatency?: Record<string, number>;
  agentRoutingReason?: string;
  agentRiskLevel?: "routine" | "caution" | "urgent";
  agentConflictCount?: number;
  agentConsensusPercent?: number;
  agentSummary?: string;
  agentRecommendations?: Array<{
    id: string;
    message: string;
    priority: "low" | "medium" | "high" | "critical";
    source: "agent" | "memory" | "device" | "rag" | "personalization" | "safety";
  }>;
  predictionCount?: number;
  highRiskPredictionCount?: number;
  predictionCategories?: string[];
  averagePredictionConfidence?: number;
  dataQualityIssues?: number;
  metricDirectAnswerUsed?: boolean;
  deviceDataSource?: AIContext["deviceDataSource"];
  deviceDataStatus?: AIContext["deviceDataStatus"];
  personalizationScore?: number;
  coachingStyle?: CoachingStyle;
  preferredResponseLength?: PreferredResponseLength;
  learnedPreferenceCount?: number;
  trendConfidence?: TrendIntelligenceConfidence;
  trendDataQuality?: TrendIntelligenceDataQuality;
  trendSignalCount?: number;
  coachingProgressScore?: number;
  activeGoalCount?: number;
  atRiskHabitCount?: number;
  topInsightCategory?: AIHealthInsightCategory;
  topInsightPriority?: AIHealthInsight["priority"];
  topInsightConfidence?: AIHealthInsight["confidence"];
  insightCount?: number;
  briefingGeneratedAt?: string;
  briefingRecommendedActionCount?: number;
  briefingFocusArea?: string;
  briefingConfidence?: DailyHealthBriefing["confidence"];
  briefingSafetyLevel?: DailyHealthBriefing["safetyLevel"];
  recommendationDecisionId?: string;
  recommendationPrimaryAction?: string;
  recommendationPrimaryCategory?: RecommendationCategory;
  recommendationPrimarySource?: RecommendationSource;
  recommendationDecisionConfidence?: RecommendationDecision["confidence"];
  recommendationAlternativeCount?: number;
  recommendationSuppressedCount?: number;
  recommendationRankingReason?: string;
  preventiveOverallRisk?: PreventiveHealthSummary["overallRisk"];
  preventivePrimaryRisk?: string;
  preventiveFocus?: PreventiveHealthSummary["focus"];
  preventiveConfidence?: PreventiveHealthSummary["confidence"];
  preventiveRiskCount?: number;
};

export type MedicalKnowledgeCitation = {
  title: string;
  sourceName: string;
  sourceUrl?: string;
  category: string;
};

export type ConversationMemoryItem = {
  id: string;
  role: "user" | "assistant";
  message: string;
  createdAt: number;
};

export type HealthInsightCategory =
  | "nutrition"
  | "fitness"
  | "sleep"
  | "medication"
  | "hydration"
  | "recovery"
  | "general";

export type HealthInsightSeverity = "positive" | "neutral" | "attention";

export type HealthInsight = {
  id: string;
  category: HealthInsightCategory;
  severity: HealthInsightSeverity;
  message: string;
};

export type Recommendation = {
  id: string;
  intent: AIIntent;
  message: string;
};

export type HealthServiceResponse<T> = {
  data: T;
  fetchedAt: string;
};

export type HealthDataState = {
  healthScore: HealthScore | null;
  nutrition: NutritionData | null;
  fitness: FitnessData | null;
  sleep: SleepData | null;
  schedule: ScheduleData | null;
  profile: ProfileData | null;
  personalProfile: PersonalHealthProfile | null;
  vitals: VitalsData | null;
  devices: ConnectedHealthDevice[];
  deviceSyncStatus: DeviceSyncStatus;
  deviceDataSource: "live" | "cache" | "fallback" | "demo" | "no_data" | "unavailable";
  deviceDataStale: boolean;
  lastHealthSyncAt: string | null;
  deviceSyncError: string | null;
  profileSyncStatus: ProfileSyncStatus;
  profileSyncError: string | null;
  lastProfileSyncAt: string | null;
  queuedProfileUpdateCount: number;
  healthSummaries: HealthSummaryBackup[];
  latestHealthSummary: HealthSummaryBackup | null;
  healthBackupStatus: HealthBackupStatus;
  healthBackupError: string | null;
  queuedHealthSummaryBackupCount: number;
  lastHealthSummaryBackupAt: string | null;
  loading: boolean;
  error: string | null;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  iconName: IconName;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  iconName: IconName;
  tone: Tone;
};

export type ProfileAction = {
  id: string;
  title: string;
  iconName: IconName;
  tone: Tone;
};
