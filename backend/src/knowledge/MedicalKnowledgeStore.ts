import { curatedHealthKnowledge } from "./seed/curatedHealthKnowledge";
import type {
  MedicalKnowledgeCategory,
  MedicalKnowledgeChunk,
  MedicalKnowledgeDocument,
} from "./MedicalKnowledgeTypes";
import { isProductionEligible } from "./governance/KnowledgeReviewPolicy";
import { scoreKnowledgeDocument } from "./governance/KnowledgeQualityScore";
import { getSourceGovernance } from "./governance/SourceGovernance";

const normalize = (value: string): string => value.trim().toLowerCase();

const toChunks = (documents: MedicalKnowledgeDocument[]): MedicalKnowledgeChunk[] =>
  documents.filter((document) => isProductionEligible(document)).flatMap((document) => {
    const sourceGovernance = getSourceGovernance(document.source.sourceName);
    const qualityScore = Math.max(document.qualityScore, scoreKnowledgeDocument(document));

    return document.chunks.map((chunk) => ({
      id: chunk.id,
      documentId: document.id,
      title: document.title,
      category: document.category,
      content: chunk.content.trim(),
      sourceName: document.source.sourceName,
      sourceUrl: document.source.sourceUrl,
      sourceType: document.source.sourceType,
      reviewedAt: document.reviewedAt,
      reviewedBy: document.reviewedBy,
      expiresAt: document.expiresAt,
      reviewStatus: document.reviewStatus,
      qualityScore,
      sourceTier: sourceGovernance.tier,
      safetyLevel: document.safetyLevel,
      tags: Array.from(new Set([...document.tags, ...(chunk.tags ?? [])].map(normalize))),
    }));
  });

export class MedicalKnowledgeStore {
  private readonly chunks: MedicalKnowledgeChunk[];
  private readonly documents: MedicalKnowledgeDocument[];

  constructor(documents: MedicalKnowledgeDocument[] = curatedHealthKnowledge) {
    this.documents = [...documents];
    this.chunks = toChunks(documents);
  }

  getAllDocuments(): MedicalKnowledgeDocument[] {
    return [...this.documents];
  }

  getAllChunks(): MedicalKnowledgeChunk[] {
    return [...this.chunks];
  }

  searchByCategory(category: MedicalKnowledgeCategory): MedicalKnowledgeChunk[] {
    return this.chunks.filter((chunk) => chunk.category === category);
  }

  searchByTags(tags: string[]): MedicalKnowledgeChunk[] {
    const normalizedTags = tags.map(normalize);

    return this.chunks.filter((chunk) =>
      chunk.tags.some((tag) => normalizedTags.some((candidate) => tag.includes(candidate) || candidate.includes(tag))),
    );
  }

  searchByKeyword(query: string, limit = 5): MedicalKnowledgeChunk[] {
    const tokens = normalize(query)
      .split(/\W+/)
      .filter((token) => token.length > 2);

    return this.chunks
      .map((chunk) => ({
        chunk,
        score: tokens.reduce((score, token) => {
          const haystack = `${chunk.title} ${chunk.category} ${chunk.tags.join(" ")} ${chunk.content}`.toLowerCase();

          return score + (haystack.includes(token) ? 1 : 0);
        }, 0),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id))
      .map((item) => item.chunk)
      .slice(0, limit);
  }

  searchRelevant(
    query: string,
    categories: MedicalKnowledgeCategory[],
    tags: string[] = [],
    limit = 5,
  ): MedicalKnowledgeChunk[] {
    const candidates = [
      ...categories.flatMap((category) => this.searchByCategory(category)),
      ...this.searchByTags(tags),
      ...this.searchByKeyword(query, limit),
    ];
    const byId = new Map<string, MedicalKnowledgeChunk>();

    candidates.forEach((chunk) => byId.set(chunk.id, chunk));

    return Array.from(byId.values()).slice(0, limit);
  }
}

export const medicalKnowledgeStore = new MedicalKnowledgeStore();
