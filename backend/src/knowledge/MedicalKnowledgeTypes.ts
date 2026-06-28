export type MedicalKnowledgeCategory =
  | "hydration"
  | "nutrition"
  | "sleep"
  | "exercise"
  | "medication_adherence"
  | "emergency_symptoms"
  | "chronic_condition_general"
  | "preventive_health"
  | "device_health_data"
  | "general_wellness";

export type MedicalKnowledgeSourceType =
  | "public_health"
  | "clinical_reference"
  | "professional_association"
  | "government"
  | "curated_internal";

export type MedicalKnowledgeSafetyLevel = "wellness" | "caution" | "urgent";
export type KnowledgeReviewStatus = "draft" | "reviewed" | "approved" | "deprecated";

export type MedicalKnowledgeSource = {
  sourceName: string;
  sourceUrl?: string;
  sourceType: MedicalKnowledgeSourceType;
};

export type MedicalKnowledgeDocument = {
  id: string;
  version: string;
  title: string;
  category: MedicalKnowledgeCategory;
  source: MedicalKnowledgeSource;
  reviewedAt: string;
  reviewedBy: string;
  expiresAt: string;
  reviewStatus: KnowledgeReviewStatus;
  qualityScore: number;
  supersedes?: string;
  isDeprecated: boolean;
  safetyLevel: MedicalKnowledgeSafetyLevel;
  tags: string[];
  chunks: Array<{
    id: string;
    content: string;
    tags?: string[];
  }>;
};

export type MedicalKnowledgeChunk = {
  id: string;
  documentId: string;
  title: string;
  category: MedicalKnowledgeCategory;
  content: string;
  sourceName: string;
  sourceUrl?: string;
  sourceType: MedicalKnowledgeSourceType;
  reviewedAt: string;
  reviewedBy: string;
  expiresAt: string;
  reviewStatus: KnowledgeReviewStatus;
  qualityScore: number;
  sourceTier: "tier_1" | "tier_2" | "tier_3" | "unsupported";
  retrievalScore?: number;
  retrievalReason?: string;
  safetyLevel: MedicalKnowledgeSafetyLevel;
  tags: string[];
  embedding?: number[];
};

export type MedicalKnowledgeCitation = {
  title: string;
  sourceName: string;
  sourceUrl?: string;
  category: MedicalKnowledgeCategory;
  sourceTier?: "tier_1" | "tier_2" | "tier_3" | "unsupported";
  qualityScore?: number;
  reviewedAt?: string;
};

export type CitationBundle = {
  citations: MedicalKnowledgeCitation[];
  hiddenCitationCount: number;
  highestTier: "tier_1" | "tier_2" | "tier_3" | "unsupported";
};

export type KnowledgeRetrievalResult = {
  chunks: MedicalKnowledgeChunk[];
  citations: MedicalKnowledgeCitation[];
  retrievalConfidence: "low" | "medium" | "high";
  appliedCategories: MedicalKnowledgeCategory[];
  retrievalReason: string;
  topMatches: Array<{
    chunkId: string;
    title: string;
    score: number;
    reason: string;
  }>;
};

export type SafetyClassification = {
  safetyLevel: "wellness" | "caution" | "urgent" | "out_of_scope";
  flags: Array<"urgent_symptoms" | "medication_risk" | "diagnosis_risk" | "self_harm" | "unsupported">;
  guidance: string;
};
