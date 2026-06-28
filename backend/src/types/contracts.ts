import { z } from "zod";

export const conversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  message: z.string(),
  createdAt: z.number(),
});

export const aiRequestSchema = z.object({
  message: z.string().min(1),
  intent: z.enum(["nutrition", "fitness", "sleep", "medication", "hydration", "general"]),
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

export const memorySchema = z.object({
  id: z.string(),
  category: z.string(),
  value: z.string(),
  sourceMessage: z.string(),
  confidence: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const profileSyncSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
  updatedAt: z.string(),
});

export type BackendAIRequest = z.infer<typeof aiRequestSchema>;
export type BackendAIResponse = z.infer<typeof aiResponseSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type ProfileSyncBody = z.infer<typeof profileSyncSchema>;
