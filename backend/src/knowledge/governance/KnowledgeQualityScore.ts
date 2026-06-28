import type { MedicalKnowledgeDocument } from "../MedicalKnowledgeTypes";
import { getSourceGovernance } from "./SourceGovernance";

const tierScore = {
  tier_1: 35,
  tier_2: 27,
  tier_3: 18,
  unsupported: 0,
};

const reviewScore = {
  approved: 30,
  reviewed: 22,
  draft: 8,
  deprecated: 0,
};

export const scoreKnowledgeDocument = (document: MedicalKnowledgeDocument): number => {
  const source = getSourceGovernance(document.source.sourceName);
  const metadataScore = document.reviewedAt && document.reviewedBy && document.expiresAt ? 15 : 0;
  const contentScore = document.chunks.every((chunk) => chunk.content.split(/\s+/).length <= 130) ? 10 : 0;
  const safetyScore = document.safetyLevel === "urgent" || document.safetyLevel === "caution" ? 8 : 10;
  const deprecatedPenalty = document.isDeprecated ? -30 : 0;

  return Math.max(0, Math.min(100, tierScore[source.tier] + reviewScore[document.reviewStatus] + metadataScore + contentScore + safetyScore + deprecatedPenalty));
};
