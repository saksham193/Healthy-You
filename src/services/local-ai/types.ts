import type {
  AIContext,
  AIIntent,
  HealthTrend,
  MemoryRecord,
  PersonalHealthProfile,
} from "../../types";

export type OfflineIntent =
  | "nutrition"
  | "fitness"
  | "sleep"
  | "hydration"
  | "medication"
  | "device_status"
  | "trend_summary"
  | "emergency"
  | "general_health"
  | "unknown";

export type OfflineResponseConfidence = "low" | "medium" | "high";

export type OfflineSafetyLevel = "routine" | "caution" | "urgent" | "limited";

export type OfflineAIRequest = {
  message: string;
  intent: AIIntent;
  offlineIntent: OfflineIntent;
  context: AIContext;
  profile: PersonalHealthProfile;
  memory: MemoryRecord[];
  trends: HealthTrend[];
};

export type OfflineRecommendation = {
  id: string;
  intent: OfflineIntent;
  message: string;
  reason: string;
  priority: "low" | "medium" | "high";
};

export type OfflineRule = {
  id: string;
  intent: OfflineIntent;
  safetyLevel: OfflineSafetyLevel;
  message: string;
  riskFlags: string[];
  nextActions: string[];
  disclaimer: string;
};

export type OfflineKnowledgeItem = {
  id: string;
  category:
    | "hydration"
    | "sleep"
    | "nutrition"
    | "exercise"
    | "medication"
    | "device";
  title: string;
  summary: string;
  keywords: string[];
};

export type OfflineAIResponse = {
  response: string;
  suggestions: string[];
  offlineIntent: OfflineIntent;
  rules: OfflineRule[];
  recommendations: OfflineRecommendation[];
  knowledge: OfflineKnowledgeItem[];
  confidence: OfflineResponseConfidence;
  safetyLevel: OfflineSafetyLevel;
  cachedResponseUsed: boolean;
};

export type CachedAIResponse = {
  id: string;
  userScope: string;
  intent: OfflineIntent;
  normalizedTopic: string;
  responseSummary: string;
  timestamp: string;
  source: "openai" | "offline";
  safetyLevel: OfflineSafetyLevel;
};

export type OfflineMemoryQueueItem = {
  id: string;
  memory: MemoryRecord;
  timestamp: string;
  source: "offline" | "sync-failure";
  attempts: number;
  lastAttemptAt?: string;
};
