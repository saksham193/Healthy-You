import { medicalKnowledgeStore, MedicalKnowledgeStore } from "./MedicalKnowledgeStore";

export type KnowledgeQualityReport = {
  totalChunks: number;
  totalDocuments: number;
  reviewCoveragePercent: number;
  tierCoverage: Record<string, number>;
  expiredDocuments: string[];
  averageQualityScore: number;
  citationEligibleChunks: number;
};

export class KnowledgeQualityReporter {
  constructor(private readonly store: MedicalKnowledgeStore = medicalKnowledgeStore) {}

  report(): KnowledgeQualityReport {
    const chunks = this.store.getAllChunks();
    const documents = this.store.getAllDocuments();
    const documentIds = Array.from(new Set(documents.map((document) => document.id)));
    const reviewed = chunks.filter((chunk) => chunk.reviewStatus === "approved" || chunk.reviewStatus === "reviewed");
    const tierCoverage = chunks.reduce<Record<string, number>>((coverage, chunk) => {
      coverage[chunk.sourceTier] = (coverage[chunk.sourceTier] ?? 0) + 1;
      return coverage;
    }, {});
    const now = Date.now();
    const expiredDocuments = Array.from(new Set(
      documents
        .filter((document) => new Date(document.expiresAt).getTime() <= now)
        .map((document) => document.id),
    ));
    const averageQualityScore = chunks.length
      ? Math.round(chunks.reduce((sum, chunk) => sum + chunk.qualityScore, 0) / chunks.length)
      : 0;

    return {
      totalChunks: chunks.length,
      totalDocuments: documentIds.length,
      reviewCoveragePercent: chunks.length ? Math.round((reviewed.length / chunks.length) * 100) : 0,
      tierCoverage,
      expiredDocuments,
      averageQualityScore,
      citationEligibleChunks: chunks.filter((chunk) => chunk.sourceTier !== "unsupported" && chunk.qualityScore >= 70).length,
    };
  }
}

export const knowledgeQualityReporter = new KnowledgeQualityReporter();
