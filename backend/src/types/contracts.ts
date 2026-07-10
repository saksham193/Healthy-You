import { z } from "zod";

export const conversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  message: z.string(),
  createdAt: z.number(),
});

export const aiIntentSchema = z.enum([
  "nutrition",
  "fitness",
  "sleep",
  "medication",
  "hydration",
  "general",
  "steps_query",
  "heart_rate_query",
  "sleep_query",
  "calories_query",
  "hydration_query",
  "activity_query",
  "device_sync_query",
  "health_score_query",
  "daily_briefing",
  "general_wellness",
  "medical_safety",
]);

export const aiRequestSchema = z.object({
  message: z.string().min(1),
  intent: aiIntentSchema,
  prompt: z.string().min(1),
  conversation: z.array(conversationMessageSchema).default([]),
  context: z.record(z.string(), z.unknown()),
  traceId: z.string().optional(),
});

export const aiResponseSchema = z.object({
  id: z.string(),
  intent: aiRequestSchema.shape.intent,
  response: z.string(),
  suggestions: z.array(z.string()),
  provider: z.enum(["mock", "openai"]),
  metadata: z.object({
    citations: z.array(z.object({
      title: z.string(),
      sourceName: z.string(),
      sourceUrl: z.string().optional(),
      category: z.string(),
    })).optional(),
    safetyLevel: z.enum(["wellness", "caution", "urgent", "out_of_scope"]).optional(),
    ragUsed: z.boolean().optional(),
    retrievalConfidence: z.enum(["low", "medium", "high"]).optional(),
    knowledgeCategories: z.array(z.string()).optional(),
    retrievalReason: z.string().optional(),
    topMatches: z.array(z.object({
      chunkId: z.string(),
      title: z.string(),
      score: z.number(),
      reason: z.string(),
    })).optional(),
    governance: z.object({
      groundingFlags: z.array(z.string()),
      grounded: z.boolean(),
      responseGoverned: z.boolean(),
      citationCount: z.number(),
    }).optional(),
    traceId: z.string().optional(),
    providerRequestId: z.string().optional(),
    evaluation: z.object({
      qualityScore: z.number(),
      groundingScore: z.number(),
      citationScore: z.number(),
      safetyScore: z.number(),
      latencyScore: z.number(),
      confidenceScore: z.number(),
      overallScore: z.number(),
    }).optional(),
    versions: z.object({
      promptVersion: z.string(),
      ragVersion: z.string(),
      knowledgeVersion: z.string(),
      providerVersion: z.string(),
      responseVersion: z.string(),
      orchestratorVersion: z.string().optional(),
    }).optional(),
    agentsUsed: z.array(z.string()).optional(),
    orchestratorVersion: z.string().optional(),
    coordinationMode: z.enum(["single", "parallel", "sequential", "consensus"]).optional(),
    agentConfidence: z.enum(["low", "medium", "high"]).optional(),
    agentLatency: z.record(z.string(), z.number()).optional(),
    agentRoutingReason: z.string().optional(),
    agentRiskLevel: z.enum(["routine", "caution", "urgent"]).optional(),
    agentConflictCount: z.number().optional(),
    agentConsensusPercent: z.number().optional(),
    agentSummary: z.string().optional(),
    agentRecommendations: z.array(z.object({
      id: z.string(),
      message: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]),
      source: z.enum(["agent", "memory", "device", "rag", "personalization", "safety"]),
    })).optional(),
    predictionCount: z.number().optional(),
    highRiskPredictionCount: z.number().optional(),
    predictionCategories: z.array(z.string()).optional(),
    averagePredictionConfidence: z.number().optional(),
    dataQualityIssues: z.number().optional(),
  }).optional(),
});

const nutritionEstimateSchema = z.number().min(0).max(10000).nullable();
const nutritionConfidenceSchema = z.number().min(0).max(1);

export const nutritionImageAnalysisItemSchema = z.object({
  name: z.string().min(1).max(120),
  confidence: nutritionConfidenceSchema,
  estimatedCalories: nutritionEstimateSchema,
  protein: nutritionEstimateSchema,
  carbs: nutritionEstimateSchema,
  fat: nutritionEstimateSchema,
  notes: z.string().max(500),
}).strict();

export const nutritionImageAnalysisResponseSchema = z.object({
  analysisId: z.string().min(1).max(160).nullable(),
  title: z.string().min(1).max(120),
  items: z.array(nutritionImageAnalysisItemSchema).max(12),
  totals: z.object({
    calories: nutritionEstimateSchema,
    protein: nutritionEstimateSchema,
    carbs: nutritionEstimateSchema,
    fat: nutritionEstimateSchema,
  }).strict(),
  confidence: nutritionConfidenceSchema,
  warnings: z.array(z.string().min(1).max(240)).min(1).max(5),
  requiresReview: z.literal(true),
}).strict();

export const attachmentAnalysisResponseSchema = z.object({
  summary: z.string().min(1).max(2000),
  safetyNote: z.string().min(1).max(400),
  fileName: z.string().min(1).max(160).optional(),
  fileType: z.string().min(1).max(120).optional(),
  limitations: z.array(z.string().min(1).max(240)).min(1).max(6),
}).strict();

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120),
});

const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "updatedAt must be a valid ISO date string.",
});

const memoryCategorySchema = z.enum([
  "profile",
  "preference",
  "goal",
  "habit",
  "conversation",
  "health",
  "nutrition",
  "fitness",
  "medication",
  "sleep",
  "other",
  "dietary_preference",
  "allergy",
  "health_concern",
  "medication_habit",
  "exercise_preference",
  "recurring_topic",
  "important_recommendation",
]);

export const memorySchema = z.object({
  id: z.string().min(1).max(180),
  category: memoryCategorySchema,
  value: z.string().min(1).max(1000),
  sourceMessage: z.string().min(1).max(4000),
  confidence: z.number().min(0).max(1),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  content: z.string().min(1).max(4000).optional(),
  summary: z.string().min(1).max(1000).optional(),
  type: memoryCategorySchema.optional(),
  source: z.enum(["conversation", "manual", "profile", "device", "import"]).optional(),
  importance: z.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  embedding: z.array(z.number()).max(2048).nullable().optional(),
});

const profileStringArray = z.array(z.string().max(200)).max(100);

const healthProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.string().max(40).optional(),
  medications: profileStringArray.optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  demographics: z.object({
    age: z.number().min(0).max(130).optional(),
    gender: z.string().max(80).optional(),
  }).partial().optional(),
  bodyMetrics: z.object({
    height: z.number().min(0).max(300).optional(),
    weight: z.number().min(0).max(1000).optional(),
    bmi: z.number().min(0).max(200).optional(),
  }).partial().optional(),
  goals: profileStringArray.optional(),
  dietaryPreferences: profileStringArray.optional(),
  allergies: profileStringArray.optional(),
  chronicConditions: profileStringArray.optional(),
  activityLevel: z.string().max(120).optional(),
  averageSleepHours: z.number().min(0).max(24).optional(),
  medicationAdherence: z.number().min(0).max(100).optional(),
  wearableMetadata: z.record(z.string(), z.unknown()).optional(),
  activityProfile: z.record(z.string(), z.unknown()).optional(),
  restProfile: z.record(z.string(), z.unknown()).optional(),
  recoveryProfile: z.record(z.string(), z.unknown()).optional(),
  profileCompletenessScore: z.number().min(0).max(100).optional(),
  updatedAt: isoDateString.optional(),
  source: z.string().max(80).optional(),
}).passthrough();

export const profileSyncSchema = z.object({
  profile: healthProfileSchema,
  updatedAt: isoDateString,
});

const aggregateMetricsSchema = z.object({
  steps: z.number().min(0).max(500000).optional(),
  caloriesBurned: z.number().min(0).max(50000).optional(),
  activeMinutes: z.number().min(0).max(1440).optional(),
  sleepMinutes: z.number().min(0).max(1440).optional(),
  hydrationMl: z.number().min(0).max(20000).optional(),
  heartRateAvg: z.number().min(20).max(240).optional(),
}).strict();

const healthScoresSchema = z.object({
  healthScore: z.number().min(0).max(100).optional(),
  sleepScore: z.number().min(0).max(100).optional(),
  fitnessScore: z.number().min(0).max(100).optional(),
}).strict();

const healthSummarySyncMetadataSchema = z.object({
  lastDeviceSyncAt: isoDateString.nullable(),
  provider: z.string().max(120).optional(),
  status: z.enum(["live", "cache", "fallback", "no_data", "cloud_summary", "unavailable"]),
}).strict();

export const healthSummarySchema = z.object({
  id: z.string().min(1).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(["health_connect", "apple_health", "mock_health", "cloud_summary", "manual"]),
  deviceSource: z.enum(["live", "cache", "fallback", "no_data", "cloud_summary", "unavailable"]),
  displaySource: z.enum(["Live Device Summary", "Cloud Summary", "Last synced summary", "Historical summary"]),
  summaryType: z.enum(["daily"]),
  metrics: aggregateMetricsSchema,
  scores: healthScoresSchema,
  syncMetadata: healthSummarySyncMetadataSchema,
  updatedAt: isoDateString,
}).strict();

export type BackendAIRequest = z.infer<typeof aiRequestSchema>;
export type BackendAIResponse = z.infer<typeof aiResponseSchema>;
export type BackendNutritionImageAnalysisResponse = z.infer<typeof nutritionImageAnalysisResponseSchema>;
export type BackendAttachmentAnalysisResponse = z.infer<typeof attachmentAnalysisResponseSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type ProfileSyncBody = z.infer<typeof profileSyncSchema>;
export type HealthSummaryBody = z.infer<typeof healthSummarySchema>;
