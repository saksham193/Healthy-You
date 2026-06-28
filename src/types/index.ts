import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { PredictionSummary } from "../services/prediction/PredictionTypes";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export type RootTabParamList = {
  Chat: undefined;
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
  | "general_wellness"
  | "medical_safety";

export type ProfileSource = "store" | "memory" | "manual";

export type PersonalHealthProfile = {
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
  demographics?: Partial<PersonalHealthProfile["demographics"]>;
  bodyMetrics?: Partial<PersonalHealthProfile["bodyMetrics"]>;
  goals?: string[];
  dietaryPreferences?: string[];
  allergies?: string[];
  chronicConditions?: string[];
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
  insights: DailyInsight[];
  personalizedRecommendations: PersonalizedRecommendation[];
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
  vitals: VitalsData | null;
  devices: ConnectedHealthDevice[];
  deviceSyncStatus: DeviceSyncStatus;
  deviceDataSource: "live" | "cache" | "fallback" | "demo" | "no_data" | "unavailable";
  deviceDataStale: boolean;
  lastHealthSyncAt: string | null;
  deviceSyncError: string | null;
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
