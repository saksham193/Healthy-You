export type ExperimentVariant = {
  id: string;
  type: "prompt" | "rag" | "retrieval" | "provider";
  label: string;
  enabled: boolean;
  weight: number;
  version: string;
};

export type ExperimentAssignment = {
  enabled: boolean;
  variant?: ExperimentVariant;
};

export class PromptExperimentFramework {
  private variants: ExperimentVariant[] = [];

  registerVariant(variant: ExperimentVariant): void {
    const existing = this.variants.findIndex((item) => item.id === variant.id);
    if (existing >= 0) {
      this.variants[existing] = { ...variant };
      return;
    }

    this.variants.push({ ...variant });
  }

  getVariants(): ExperimentVariant[] {
    return this.variants.map((variant) => ({ ...variant }));
  }

  clear(): void {
    this.variants = [];
  }

  assign(type: ExperimentVariant["type"], stableKey: string): ExperimentAssignment {
    const enabled = this.variants.filter((variant) => variant.type === type && variant.enabled && variant.weight > 0);
    if (!enabled.length) {
      return { enabled: false };
    }

    const total = enabled.reduce((sum, variant) => sum + variant.weight, 0);
    const bucket = this.hash(stableKey) % total;
    let cursor = 0;
    const variant = enabled.find((item) => {
      cursor += item.weight;
      return bucket < cursor;
    });

    return variant ? { enabled: true, variant: { ...variant } } : { enabled: false };
  }

  private hash(value: string): number {
    return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
  }
}

export const promptExperimentFramework = new PromptExperimentFramework();
