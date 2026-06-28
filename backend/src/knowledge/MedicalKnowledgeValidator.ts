import type { MedicalKnowledgeDocument } from "./MedicalKnowledgeTypes";
import { MAX_CHUNK_WORDS, MIN_PRODUCTION_QUALITY_SCORE, isExpired } from "./governance/KnowledgeReviewPolicy";
import { scoreKnowledgeDocument } from "./governance/KnowledgeQualityScore";
import { getSourceGovernance } from "./governance/SourceGovernance";

export type KnowledgeValidationIssue = {
  documentId: string;
  severity: "error" | "warning";
  message: string;
};

export type KnowledgeValidationResult = {
  valid: boolean;
  issues: KnowledgeValidationIssue[];
  acceptedDocumentIds: string[];
  rejectedDocumentIds: string[];
};

const validCategories = new Set([
  "hydration",
  "nutrition",
  "sleep",
  "exercise",
  "medication_adherence",
  "emergency_symptoms",
  "chronic_condition_general",
  "preventive_health",
  "device_health_data",
  "general_wellness",
]);

export class MedicalKnowledgeValidator {
  validate(documents: MedicalKnowledgeDocument[]): KnowledgeValidationResult {
    const ids = new Set<string>();
    const chunkIds = new Set<string>();
    const issues: KnowledgeValidationIssue[] = [];
    const acceptedDocumentIds: string[] = [];
    const rejectedDocumentIds: string[] = [];

    documents.forEach((document) => {
      const documentIssues: KnowledgeValidationIssue[] = [];
      const source = getSourceGovernance(document.source.sourceName);
      const computedQuality = scoreKnowledgeDocument(document);

      if (ids.has(document.id)) {
        documentIssues.push({ documentId: document.id, severity: "error", message: "Duplicate document id." });
      }
      ids.add(document.id);

      if (!document.version || !document.reviewedAt || !document.reviewedBy || !document.expiresAt) {
        documentIssues.push({ documentId: document.id, severity: "error", message: "Missing required lifecycle metadata." });
      }

      if (!validCategories.has(document.category)) {
        documentIssues.push({ documentId: document.id, severity: "error", message: "Unsupported knowledge category." });
      }

      if (source.tier === "unsupported") {
        documentIssues.push({ documentId: document.id, severity: "error", message: "Unsupported source tier." });
      }

      if (document.reviewStatus === "draft") {
        documentIssues.push({ documentId: document.id, severity: "warning", message: "Draft documents are limited and excluded from production retrieval." });
      }

      if (document.reviewStatus === "deprecated" || document.isDeprecated) {
        documentIssues.push({ documentId: document.id, severity: "error", message: "Deprecated documents are excluded." });
      }

      if (isExpired(document)) {
        documentIssues.push({ documentId: document.id, severity: "error", message: "Expired documents are excluded." });
      }

      if (document.qualityScore < MIN_PRODUCTION_QUALITY_SCORE || computedQuality < MIN_PRODUCTION_QUALITY_SCORE) {
        documentIssues.push({ documentId: document.id, severity: "error", message: "Quality score below production threshold." });
      }

      document.chunks.forEach((chunk) => {
        if (chunkIds.has(chunk.id)) {
          documentIssues.push({ documentId: document.id, severity: "error", message: `Duplicate chunk id ${chunk.id}.` });
        }
        chunkIds.add(chunk.id);

        if (!chunk.content.trim()) {
          documentIssues.push({ documentId: document.id, severity: "error", message: `Empty chunk ${chunk.id}.` });
        }

        if (chunk.content.split(/\s+/).length > MAX_CHUNK_WORDS) {
          documentIssues.push({ documentId: document.id, severity: "error", message: `Chunk ${chunk.id} exceeds word limit.` });
        }
      });

      issues.push(...documentIssues);

      if (documentIssues.some((issue) => issue.severity === "error")) {
        rejectedDocumentIds.push(document.id);
      } else {
        acceptedDocumentIds.push(document.id);
      }
    });

    return {
      valid: issues.every((issue) => issue.severity !== "error"),
      issues,
      acceptedDocumentIds,
      rejectedDocumentIds,
    };
  }
}

export const medicalKnowledgeValidator = new MedicalKnowledgeValidator();
