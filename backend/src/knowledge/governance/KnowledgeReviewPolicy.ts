import type { MedicalKnowledgeDocument } from "../MedicalKnowledgeTypes";
import { getSourceGovernance } from "./SourceGovernance";

export const REVIEWED_BY_SYSTEM = "Healthy You Medical Knowledge Governance";
export const DEFAULT_REVIEW_FREQUENCY_DAYS = 365;
export const MIN_PRODUCTION_QUALITY_SCORE = 70;
export const MAX_CHUNK_WORDS = 130;

export const isExpired = (document: MedicalKnowledgeDocument, now = new Date()): boolean =>
  new Date(document.expiresAt).getTime() <= now.getTime();

export const isProductionEligible = (document: MedicalKnowledgeDocument, now = new Date()): boolean => {
  const source = getSourceGovernance(document.source.sourceName);

  return (
    source.approvedForProduction &&
    document.reviewStatus === "approved" &&
    !document.isDeprecated &&
    !isExpired(document, now) &&
    document.qualityScore >= MIN_PRODUCTION_QUALITY_SCORE
  );
};

export const getReviewRiskNote = (document: MedicalKnowledgeDocument): string => {
  const source = getSourceGovernance(document.source.sourceName);

  if (document.isDeprecated) return "Document is deprecated.";
  if (source.tier === "unsupported") return "Source is unsupported.";
  if (document.reviewStatus !== "approved") return "Document is not approved for production.";
  if (document.qualityScore < MIN_PRODUCTION_QUALITY_SCORE) return "Document quality score is below production threshold.";

  return "Document passes production review policy.";
};
