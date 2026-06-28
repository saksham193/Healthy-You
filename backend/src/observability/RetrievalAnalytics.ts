import type { KnowledgeRetrievalResult } from "../knowledge/MedicalKnowledgeTypes";

export class RetrievalAnalytics {
  private retrievalCount = 0;
  private fallbackCount = 0;
  private readonly confidenceDistribution: Record<string, number> = {};
  private readonly categoryUsage: Record<string, number> = {};
  private citationCovered = 0;
  private misses = 0;

  track(result: KnowledgeRetrievalResult): void {
    this.retrievalCount += 1;
    this.confidenceDistribution[result.retrievalConfidence] = (this.confidenceDistribution[result.retrievalConfidence] ?? 0) + 1;
    if (result.citations.length > 0) this.citationCovered += 1;
    if (result.chunks.length === 0 || result.retrievalConfidence === "low") this.misses += 1;
    result.appliedCategories.forEach((category) => {
      this.categoryUsage[category] = (this.categoryUsage[category] ?? 0) + 1;
    });
  }

  trackFallback(): void {
    this.fallbackCount += 1;
  }

  report(): Record<string, unknown> {
    return {
      retrievalCount: this.retrievalCount,
      categoryUsage: this.categoryUsage,
      confidenceDistribution: this.confidenceDistribution,
      citationCoveragePercent: this.retrievalCount ? Math.round((this.citationCovered / this.retrievalCount) * 100) : 0,
      fallbackFrequency: this.fallbackCount,
      knowledgeMisses: this.misses,
      topCategories: Object.entries(this.categoryUsage).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }

  reset(): void {
    this.retrievalCount = 0;
    this.fallbackCount = 0;
    this.citationCovered = 0;
    this.misses = 0;
    Object.keys(this.confidenceDistribution).forEach((key) => delete this.confidenceDistribution[key]);
    Object.keys(this.categoryUsage).forEach((key) => delete this.categoryUsage[key]);
  }
}

export const retrievalAnalytics = new RetrievalAnalytics();
