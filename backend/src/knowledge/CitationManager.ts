import type { CitationBundle, MedicalKnowledgeChunk, MedicalKnowledgeCitation } from "./MedicalKnowledgeTypes";

const tierRank = {
  tier_1: 4,
  tier_2: 3,
  tier_3: 2,
  unsupported: 0,
};

const toCitation = (chunk: MedicalKnowledgeChunk): MedicalKnowledgeCitation => ({
  title: chunk.title,
  sourceName: chunk.sourceName,
  sourceUrl: chunk.sourceUrl,
  category: chunk.category,
  sourceTier: chunk.sourceTier,
  qualityScore: chunk.qualityScore,
  reviewedAt: chunk.reviewedAt,
});

export class CitationManager {
  build(chunks: MedicalKnowledgeChunk[], cap = 3): CitationBundle {
    const ranked = chunks
      .filter((chunk) => chunk.sourceTier !== "unsupported" && chunk.qualityScore >= 70)
      .sort((left, right) =>
        tierRank[right.sourceTier] - tierRank[left.sourceTier] ||
        right.qualityScore - left.qualityScore ||
        right.reviewedAt.localeCompare(left.reviewedAt),
      );
    const byKey = new Map<string, MedicalKnowledgeCitation>();

    ranked.forEach((chunk) => {
      const citation = toCitation(chunk);
      const key = `${citation.title}-${citation.sourceName}-${citation.category}`;

      if (!byKey.has(key)) {
        byKey.set(key, citation);
      }
    });

    const citations = Array.from(byKey.values()).slice(0, cap);

    return {
      citations,
      hiddenCitationCount: Math.max(0, byKey.size - citations.length),
      highestTier: citations[0]?.sourceTier ?? "unsupported",
    };
  }
}

export const citationManager = new CitationManager();
