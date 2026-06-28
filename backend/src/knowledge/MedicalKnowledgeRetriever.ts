import type { BackendAIRequest } from "../types/contracts";
import { citationManager } from "./CitationManager";
import { medicalKnowledgeStore, MedicalKnowledgeStore } from "./MedicalKnowledgeStore";
import type {
  KnowledgeRetrievalResult,
  MedicalKnowledgeCategory,
  MedicalKnowledgeChunk,
  SafetyClassification,
} from "./MedicalKnowledgeTypes";

const intentCategoryMap: Record<BackendAIRequest["intent"], MedicalKnowledgeCategory[]> = {
  nutrition: ["nutrition"],
  fitness: ["exercise", "device_health_data"],
  sleep: ["sleep"],
  medication: ["medication_adherence"],
  hydration: ["hydration"],
  general: ["general_wellness", "preventive_health"],
};

const categoryRules: Array<{ category: MedicalKnowledgeCategory; patterns: RegExp[] }> = [
  { category: "emergency_symptoms", patterns: [/\bchest pain|cannot breathe|can't breathe|stroke|faint|allergic reaction|suicid/i] },
  { category: "medication_adherence", patterns: [/\bmedication|medicine|pill|dose|dosage|missed|pharmacist|prescription/i] },
  { category: "hydration", patterns: [/\bwater|hydration|dehydrat|fluids|thirst/i] },
  { category: "sleep", patterns: [/\bsleep|slept|bedtime|insomnia|fatigue|tired/i] },
  { category: "exercise", patterns: [/\bexercise|workout|steps|activity|heart rate|recovery|walk|run/i] },
  { category: "nutrition", patterns: [/\bnutrition|meal|diet|protein|vegetarian|food|calories|eat/i] },
  { category: "device_health_data", patterns: [/\bwearable|watch|device|sync|sensor|health data/i] },
  { category: "chronic_condition_general", patterns: [/\bdiabetes|hypertension|asthma|chronic|blood pressure/i] },
  { category: "preventive_health", patterns: [/\bdoctor|clinician|professional|symptoms|care|checkup/i] },
];

const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

const tierWeight = { tier_1: 30, tier_2: 22, tier_3: 10, unsupported: 0 };
const safetyWeight = { wellness: 8, caution: 10, urgent: 12 };

const confidence = (chunks: MedicalKnowledgeChunk[]): KnowledgeRetrievalResult["retrievalConfidence"] => {
  const topScore = chunks[0]?.retrievalScore ?? 0;

  if (topScore >= 75 && chunks.length >= 2) return "high";
  if (topScore >= 45) return "medium";

  return "low";
};

const tokenScore = (query: string, chunk: MedicalKnowledgeChunk): number => {
  const tokens = query.toLowerCase().split(/\W+/).filter((token) => token.length > 3);
  const haystack = `${chunk.title} ${chunk.category} ${chunk.tags.join(" ")} ${chunk.content}`.toLowerCase();

  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 4 : 0), 0);
};

const recencyScore = (reviewedAt: string): number => {
  const ageDays = (Date.now() - new Date(reviewedAt).getTime()) / (24 * 60 * 60 * 1000);

  if (!Number.isFinite(ageDays)) return 0;
  if (ageDays <= 365) return 10;
  if (ageDays <= 730) return 5;

  return 1;
};

export class MedicalKnowledgeRetriever {
  constructor(private readonly store: MedicalKnowledgeStore = medicalKnowledgeStore) {}

  retrieve(request: BackendAIRequest, safety: SafetyClassification): KnowledgeRetrievalResult {
    const query = `${request.message} ${request.prompt}`;
    const matchedCategories = categoryRules
      .filter((rule) => rule.patterns.some((pattern) => pattern.test(query)))
      .map((rule) => rule.category);
    const safetyCategories: MedicalKnowledgeCategory[] = safety.safetyLevel === "urgent"
      ? ["emergency_symptoms"]
      : safety.flags.includes("medication_risk")
        ? ["medication_adherence", "preventive_health"]
        : safety.flags.includes("diagnosis_risk")
          ? ["preventive_health", "general_wellness"]
          : [];
    const categories: MedicalKnowledgeCategory[] = unique<MedicalKnowledgeCategory>([
      ...safetyCategories,
      ...matchedCategories,
      ...intentCategoryMap[request.intent],
      "general_wellness",
    ]).slice(0, 5);
    const tags = query
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 3)
      .slice(0, 8);
    const chunks = this.store.searchRelevant(query, categories, tags, 8)
      .map((chunk) => {
        const categoryMatch = categories.includes(chunk.category) ? 20 : 0;
        const sourceQuality = tierWeight[chunk.sourceTier] + Math.round(chunk.qualityScore / 5);
        const safetyAlignment = safety.safetyLevel === "urgent" && chunk.category === "emergency_symptoms"
          ? 20
          : safety.flags.includes("medication_risk") && chunk.category === "medication_adherence"
            ? 18
            : safetyWeight[chunk.safetyLevel];
        const semantic = tokenScore(query, chunk);
        const score = categoryMatch + sourceQuality + safetyAlignment + recencyScore(chunk.reviewedAt) + semantic;
        const reason = [
          categoryMatch ? "category match" : "",
          semantic ? "keyword relevance" : "",
          `source ${chunk.sourceTier}`,
          `quality ${chunk.qualityScore}`,
          safetyAlignment >= 18 ? "safety aligned" : "",
        ].filter(Boolean).join("; ");

        return {
          ...chunk,
          retrievalScore: score,
          retrievalReason: reason,
        };
      })
      .filter((chunk) => (chunk.retrievalScore ?? 0) >= 35)
      .sort((left, right) => (right.retrievalScore ?? 0) - (left.retrievalScore ?? 0))
      .slice(0, 5);
    const citationBundle = citationManager.build(chunks);
    const retrievalConfidence = confidence(chunks);

    return {
      chunks,
      citations: citationBundle.citations,
      retrievalConfidence,
      appliedCategories: unique(chunks.map((chunk) => chunk.category)),
      retrievalReason: chunks.length
        ? `Top match scored ${chunks[0]?.retrievalScore ?? 0}; confidence ${retrievalConfidence}.`
        : "No governed knowledge met the retrieval threshold.",
      topMatches: chunks.map((chunk) => ({
        chunkId: chunk.id,
        title: chunk.title,
        score: chunk.retrievalScore ?? 0,
        reason: chunk.retrievalReason ?? "Matched governed medical knowledge.",
      })),
    };
  }
}

export const medicalKnowledgeRetriever = new MedicalKnowledgeRetriever();
