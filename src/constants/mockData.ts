import type {
  ConversationHistory,
  ConversationMessage,
  Achievement,
  BodyMetric,
  ConnectedDevice,
  EmergencyContact,
  ExerciseCategory,
  FitnessAction,
  FitnessSummary,
  HealthGoal,
  HealthSummary,
  HomeFeature,
  MacroNutrient,
  MedicalInfo,
  MedibotAction,
  MedibotPrompt,
  NutritionAction,
  NutritionInsight,
  NutritionMeal,
  NutritionSummary,
  ProfileAction,
  ProfileSummary,
  RecoveryInsight,
  Appointment,
  SleepInsight,
  Habit,
  MedicationReminder,
  ScheduleAdherence,
  ScheduleAction,
  ScheduleSummary,
  SleepSchedule,
  TimelineEvent,
  VitalMetric,
  WeeklyActivityPoint,
  WorkoutPlan,
} from "../types";

export const healthSummaries: HealthSummary[] = [
  {
    id: "steps",
    title: "Steps",
    value: "8,500",
    suffix: "/10,000",
    iconName: "footsteps-outline",
    tone: "primary",
  },
  {
    id: "calories",
    title: "Calories",
    value: "420",
    suffix: "kcal",
    iconName: "flame-outline",
    tone: "warning",
  },
];

export const homeFeatures: HomeFeature[] = [
  {
    id: "nutrition",
    title: "Nutrition",
    subtitle: "Diet plans and calories",
    iconName: "nutrition-outline",
    tone: "accent",
  },
  {
    id: "fitness",
    title: "Fitness",
    subtitle: "Workouts and BMI",
    iconName: "barbell-outline",
    tone: "primary",
  },
  {
    id: "sleep",
    title: "Sleep",
    subtitle: "Quality and recovery",
    iconName: "moon-outline",
    tone: "warning",
  },
  {
    id: "schedule",
    title: "Schedule",
    subtitle: "Medicine reminders",
    iconName: "calendar-outline",
    tone: "danger",
  },
];

export const nutritionSummary: NutritionSummary = {
  score: 84,
  scoreLabel: "Excellent",
  caloriesConsumed: 1590,
  calorieGoal: 2100,
  caloriesRemaining: 510,
  waterGlasses: 6,
  waterGoal: 8,
  waterGoalAchieved: false,
};

export const macroNutrients: MacroNutrient[] = [
  {
    id: "protein",
    name: "Protein",
    consumed: 95,
    goal: 120,
    unit: "g",
    percent: 79,
    iconName: "fitness-outline",
    tone: "primary",
  },
  {
    id: "carbs",
    name: "Carbs",
    consumed: 180,
    goal: 250,
    unit: "g",
    percent: 72,
    iconName: "leaf-outline",
    tone: "accent",
  },
  {
    id: "fat",
    name: "Fat",
    consumed: 52,
    goal: 70,
    unit: "g",
    percent: 74,
    iconName: "flame-outline",
    tone: "warning",
  },
  {
    id: "fiber",
    name: "Fiber",
    consumed: 24,
    goal: 30,
    unit: "g",
    percent: 80,
    iconName: "nutrition-outline",
    tone: "danger",
  },
];

export const nutritionMeals: NutritionMeal[] = [
  {
    id: "breakfast",
    name: "Breakfast",
    detail: "Oats, Banana, Almonds",
    calories: 380,
    iconName: "sunny-outline",
  },
  {
    id: "lunch",
    name: "Lunch",
    detail: "Rice Bowl + Paneer + Salad",
    calories: 560,
    iconName: "restaurant-outline",
  },
  {
    id: "dinner",
    name: "Dinner",
    detail: "Dal + Roti + Vegetables",
    calories: 490,
    iconName: "moon-outline",
  },
  {
    id: "snacks",
    name: "Snacks",
    detail: "Fruit + Green Tea",
    calories: 160,
    iconName: "cafe-outline",
  },
];

export const nutritionInsights: NutritionInsight[] = [
  {
    id: "protein",
    title: "Protein Intake",
    status: "Good",
    detail: "You are meeting your daily protein goal.",
    iconName: "checkmark-circle-outline",
    tone: "accent",
  },
  {
    id: "hydration",
    title: "Hydration",
    status: "Needs Attention",
    detail: "Drink 2 more glasses of water.",
    iconName: "water-outline",
    tone: "warning",
  },
  {
    id: "calories",
    title: "Calories",
    status: "On Track",
    detail: "Within your calorie target.",
    iconName: "trending-up-outline",
    tone: "primary",
  },
];

export const nutritionActions: NutritionAction[] = [
  { id: "log-meal", title: "Log Meal", iconName: "add-circle-outline", tone: "primary" },
  { id: "scan-food", title: "Scan Food", iconName: "scan-outline", tone: "accent" },
  { id: "ai-meal-plan", title: "AI Meal Plan", iconName: "sparkles-outline", tone: "warning" },
];

export const fitnessSummary: FitnessSummary = {
  score: 87,
  scoreLabel: "Excellent",
  weeklyActivityMinutes: 395,
  weeklyTrend: "+12% this week",
  caloriesBurned: 540,
  calorieGoal: 700,
  caloriesRemaining: 160,
  workoutProgress: 68,
  workoutsCompleted: 2,
  workoutsTotal: 3,
  height: "175 cm",
  weight: "72 kg",
  bmi: 23.5,
  bmiStatus: "Healthy Weight",
  steps: 8500,
  stepGoal: 10000,
  stepProgress: 85,
};

export const weeklyActivity: WeeklyActivityPoint[] = [
  { day: "Mon", minutes: 45 },
  { day: "Tue", minutes: 60 },
  { day: "Wed", minutes: 35 },
  { day: "Thu", minutes: 75 },
  { day: "Fri", minutes: 50 },
  { day: "Sat", minutes: 90 },
  { day: "Sun", minutes: 40 },
];

export const workoutPlans: WorkoutPlan[] = [
  {
    id: "warmup",
    name: "Warmup",
    duration: "8 min",
    difficulty: "Easy",
    status: "completed",
    iconName: "body-outline",
    tone: "accent",
  },
  {
    id: "strength",
    name: "Strength",
    duration: "18 min",
    difficulty: "Medium",
    status: "completed",
    iconName: "barbell-outline",
    tone: "primary",
  },
  {
    id: "cardio",
    name: "Cardio",
    duration: "20 min",
    difficulty: "Moderate",
    status: "active",
    iconName: "walk-outline",
    tone: "warning",
  },
];

export const exerciseCategories: ExerciseCategory[] = [
  {
    id: "strength-training",
    title: "Strength Training",
    description: "Build muscle with guided resistance sessions.",
    iconName: "barbell-outline",
    tone: "primary",
  },
  {
    id: "cardio",
    title: "Cardio",
    description: "Improve endurance with heart-rate focused workouts.",
    iconName: "heart-outline",
    tone: "danger",
  },
  {
    id: "yoga",
    title: "Yoga",
    description: "Increase balance, breathing control and flexibility.",
    iconName: "leaf-outline",
    tone: "accent",
  },
  {
    id: "mobility",
    title: "Mobility",
    description: "Recover range of motion with low-impact flows.",
    iconName: "accessibility-outline",
    tone: "warning",
  },
];

export const recoveryInsights: RecoveryInsight[] = [
  {
    id: "recovery",
    title: "Recovery",
    status: "Good",
    detail: "Body recovering well.",
    iconName: "checkmark-circle-outline",
    tone: "accent",
  },
  {
    id: "sleep-impact",
    title: "Sleep Impact",
    status: "Moderate",
    detail: "Sleep affected workout intensity.",
    iconName: "moon-outline",
    tone: "warning",
  },
  {
    id: "activity-trend",
    title: "Activity Trend",
    status: "Improving",
    detail: "Consistency increasing.",
    iconName: "trending-up-outline",
    tone: "primary",
  },
];

export const fitnessActions: FitnessAction[] = [
  { id: "start-workout", title: "Start Workout", iconName: "play-circle-outline", tone: "primary" },
  { id: "log-exercise", title: "Log Exercise", iconName: "add-circle-outline", tone: "accent" },
  { id: "ai-fitness-coach", title: "AI Fitness Coach", iconName: "sparkles-outline", tone: "warning" },
];

export const sleepInsights: SleepInsight[] = [
  { id: "duration", title: "Sleep Duration", value: "7h 30m", detail: "Within your target range" },
  { id: "quality", title: "Sleep Quality", value: "82%", detail: "Restful with minor interruptions" },
  { id: "routine", title: "Insight", value: "10:45 PM", detail: "Best bedtime for your current rhythm" },
];

export const medibotPrompts: MedibotPrompt[] = [
  { id: "analyze-sleep", label: "Analyze my sleep" },
  { id: "meal-plan", label: "Build a meal plan" },
  { id: "blood-pressure", label: "Explain blood pressure" },
  { id: "energy", label: "Improve energy levels" },
  { id: "exercise", label: "Suggest exercises" },
  { id: "hydration", label: "Hydration advice" },
];

export const medibotQuickActions: MedibotAction[] = [
  { id: "nutrition-advice", title: "Nutrition Advice", iconName: "nutrition-outline", tone: "accent" },
  { id: "workout-coach", title: "Workout Coach", iconName: "barbell-outline", tone: "primary" },
  { id: "sleep-analysis", title: "Sleep Analysis", iconName: "moon-outline", tone: "warning" },
  { id: "medication-help", title: "Medication Help", iconName: "medkit-outline", tone: "danger" },
  { id: "symptom-checker", title: "Symptom Checker", iconName: "pulse-outline", tone: "primary" },
  { id: "water-tracking", title: "Water Tracking", iconName: "water-outline", tone: "accent" },
];

export const medibotHistory: ConversationHistory[] = [
  {
    id: "sleep-quality",
    group: "Today",
    title: "Sleep quality analysis",
    iconName: "moon-outline",
    tone: "warning",
  },
  {
    id: "calorie-recommendations",
    group: "Yesterday",
    title: "Calorie recommendations",
    iconName: "restaurant-outline",
    tone: "accent",
  },
  {
    id: "heart-rate",
    group: "Last Week",
    title: "Heart rate explanation",
    iconName: "heart-outline",
    tone: "danger",
  },
];

export const medibotConversation: ConversationMessage[] = [
  {
    id: "assistant-1",
    role: "assistant",
    message:
      "Hi Saksham. I can help you understand wellness trends, build routines, and prepare better questions for your clinician.",
  },
  {
    id: "user-1",
    role: "user",
    message: "How can I improve my energy today?",
  },
  {
    id: "assistant-2",
    role: "assistant",
    message:
      "Start with hydration, a protein-rich breakfast, ten minutes of daylight, and a light walk. Keep caffeine earlier in the day if sleep has been uneven.",
  },
];

export const scheduleSummary: ScheduleSummary = {
  completedTasks: 8,
  totalTasks: 10,
  remainingTasks: 2,
  completionPercent: 82,
  waterGlasses: 6,
  waterGoal: 8,
};

export const timelineEvents: TimelineEvent[] = [
  {
    id: "morning-medication",
    time: "07:00 AM",
    title: "Morning Medication",
    subtitle: "Vitamin D and Metformin",
    iconName: "medical-outline",
    status: "completed",
  },
  {
    id: "water-break",
    time: "09:00 AM",
    title: "Drink Water",
    subtitle: "Second hydration check-in",
    iconName: "water-outline",
    status: "completed",
  },
  {
    id: "lunch-reminder",
    time: "12:30 PM",
    title: "Lunch Reminder",
    subtitle: "Balanced meal with protein",
    iconName: "restaurant-outline",
    status: "upcoming",
  },
  {
    id: "workout-session",
    time: "06:00 PM",
    title: "Workout Session",
    subtitle: "Cardio and mobility plan",
    iconName: "barbell-outline",
    status: "upcoming",
  },
  {
    id: "sleep-reminder",
    time: "10:30 PM",
    title: "Sleep Reminder",
    subtitle: "Start wind-down routine",
    iconName: "moon-outline",
    status: "missed",
  },
];

export const medications: MedicationReminder[] = [
  { id: "vitamin-d", name: "Vitamin D", dosage: "1 Tablet", time: "07:00 AM", status: "completed" },
  { id: "metformin", name: "Metformin", dosage: "500mg", time: "07:00 AM", status: "pending" },
  { id: "omega-3", name: "Omega 3", dosage: "1 Capsule", time: "08:30 PM", status: "pending" },
];

export const appointments: Appointment[] = [
  {
    id: "cardiologist",
    doctorName: "Dr. Mehra",
    specialty: "Cardiologist",
    date: "July 15",
    time: "11:00 AM",
    location: "Apollo Heart Centre",
    iconName: "heart-outline",
  },
  {
    id: "dentist",
    doctorName: "Dr. Rao",
    specialty: "Dentist",
    date: "July 18",
    time: "3:00 PM",
    location: "Smile Dental Studio",
    iconName: "medical-outline",
  },
  {
    id: "health-checkup",
    doctorName: "Dr. Sharma",
    specialty: "Health Checkup",
    date: "July 25",
    time: "9:00 AM",
    location: "Healthy You Clinic",
    iconName: "clipboard-outline",
  },
];

export const habits: Habit[] = [
  { id: "drink-water", title: "Drink Water", streak: "9 day streak", completed: true, iconName: "water-outline", tone: "accent" },
  { id: "stretching", title: "Stretching", streak: "4 day streak", completed: true, iconName: "accessibility-outline", tone: "primary" },
  { id: "meditation", title: "Meditation", streak: "6 day streak", completed: false, iconName: "leaf-outline", tone: "warning" },
  { id: "walk-steps", title: "Walk 8000 Steps", streak: "12 day streak", completed: true, iconName: "walk-outline", tone: "accent" },
  { id: "take-vitamins", title: "Take Vitamins", streak: "15 day streak", completed: false, iconName: "medkit-outline", tone: "danger" },
];

export const sleepSchedule: SleepSchedule = {
  bedtime: "10:30 PM",
  wakeTime: "06:30 AM",
  goalHours: 8,
  plannedHours: 8,
  progressPercent: 92,
};

export const adherenceData: ScheduleAdherence = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  values: [86, 92, 78, 88, 94, 82, 90],
};

export const scheduleActions: ScheduleAction[] = [
  { id: "add-reminder", title: "Add Reminder", iconName: "notifications-outline", tone: "primary" },
  { id: "add-medication", title: "Add Medication", iconName: "medkit-outline", tone: "accent" },
  { id: "book-appointment", title: "Book Appointment", iconName: "calendar-outline", tone: "warning" },
  { id: "add-habit", title: "Add Habit", iconName: "checkmark-circle-outline", tone: "danger" },
  { id: "create-schedule", title: "Create Schedule", iconName: "sparkles-outline", tone: "primary" },
];

export const profileSummary: ProfileSummary = {
  name: "Saksham Gupta",
  age: 22,
  gender: "Male",
  bloodGroup: "B+",
  healthScore: 86,
  healthStatus: "Excellent",
  monthlyChange: "+4%",
};

export const bodyMetrics: BodyMetric[] = [
  { id: "height", title: "Height", value: "178 cm", subtitle: "Last updated today", iconName: "resize-outline", tone: "primary" },
  { id: "weight", title: "Weight", value: "72 kg", subtitle: "Stable range", iconName: "barbell-outline", tone: "accent" },
  { id: "bmi", title: "BMI", value: "22.7", subtitle: "Healthy weight", iconName: "analytics-outline", tone: "warning" },
  { id: "body-fat", title: "Body Fat", value: "18%", subtitle: "Fitness range", iconName: "body-outline", tone: "danger" },
];

export const vitalMetrics: VitalMetric[] = [
  { id: "heart-rate", title: "Heart Rate", value: "82 bpm", subtitle: "Current", iconName: "heart-outline", tone: "danger" },
  { id: "blood-pressure", title: "Blood Pressure", value: "120/80", subtitle: "Normal", iconName: "pulse-outline", tone: "primary" },
  { id: "oxygen", title: "Oxygen Saturation", value: "98%", subtitle: "Healthy", iconName: "fitness-outline", tone: "accent" },
  { id: "resting-heart", title: "Resting Heart Rate", value: "68 bpm", subtitle: "7 day average", iconName: "speedometer-outline", tone: "warning" },
];

export const healthGoals: HealthGoal[] = [
  { id: "daily-steps", title: "Daily Steps", current: 8500, target: 10000, unit: "steps", iconName: "footsteps-outline", tone: "primary" },
  { id: "water-intake", title: "Water Intake", current: 2.5, target: 3, unit: "L", iconName: "water-outline", tone: "accent" },
  { id: "sleep-goal", title: "Sleep Goal", current: 7, target: 8, unit: "hrs", iconName: "moon-outline", tone: "warning" },
  { id: "workout-goal", title: "Workout Goal", current: 4, target: 5, unit: "workouts", iconName: "barbell-outline", tone: "danger" },
];

export const medicalInfo: MedicalInfo[] = [
  { id: "blood-group", label: "Blood Group", value: "B+", iconName: "water-outline", tone: "danger" },
  { id: "allergies", label: "Allergies", value: "Peanuts", iconName: "alert-circle-outline", tone: "warning" },
  { id: "conditions", label: "Chronic Conditions", value: "None", iconName: "shield-checkmark-outline", tone: "accent" },
  { id: "medications", label: "Current Medications", value: "Vitamin D", iconName: "medkit-outline", tone: "primary" },
];

export const connectedDevices: ConnectedDevice[] = [
  { id: "apple-watch", name: "Apple Watch", detail: "Syncing heart, sleep, and activity", status: "Connected", iconName: "watch-outline" },
  { id: "google-fit", name: "Google Fit", detail: "Steps and workout imports", status: "Connected", iconName: "logo-google" },
  { id: "samsung-health", name: "Samsung Health", detail: "Not currently linked", status: "Disconnected", iconName: "phone-portrait-outline" },
];

export const emergencyContacts: EmergencyContact[] = [
  { id: "father", name: "Rajesh Gupta", relationship: "Father", phoneNumber: "+91 98765 43210", iconName: "person-outline" },
  { id: "mother", name: "Anita Gupta", relationship: "Mother", phoneNumber: "+91 98765 43211", iconName: "person-outline" },
  { id: "doctor", name: "Dr. Sharma", relationship: "Doctor", phoneNumber: "+91 98765 43212", iconName: "medical-outline" },
];

export const achievements: Achievement[] = [
  { id: "steps-streak", title: "10k Steps Streak", description: "Hit your step goal five days in a row.", iconName: "trophy-outline", tone: "primary" },
  { id: "hydration-master", title: "Hydration Master", description: "Met your water goal for the week.", iconName: "water-outline", tone: "accent" },
  { id: "early-sleeper", title: "Early Sleeper", description: "Kept a consistent wind-down routine.", iconName: "moon-outline", tone: "warning" },
  { id: "workout-champion", title: "Workout Champion", description: "Completed four planned workouts.", iconName: "ribbon-outline", tone: "danger" },
];

export const profileActions: ProfileAction[] = [
  { id: "edit-profile", title: "Edit Profile", iconName: "create-outline", tone: "primary" },
  { id: "export-report", title: "Export Health Report", iconName: "document-text-outline", tone: "accent" },
  { id: "share-summary", title: "Share Health Summary", iconName: "share-social-outline", tone: "warning" },
  { id: "manage-devices", title: "Manage Devices", iconName: "watch-outline", tone: "danger" },
];
