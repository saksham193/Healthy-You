export type ExperimentVariant = {
  enabled: boolean;
  variant: string;
};

export class ExperimentFramework {
  private readonly flags = new Map<string, ExperimentVariant>();

  constructor() {
    this.flags.set("prompt_variant", { enabled: false, variant: "control" });
    this.flags.set("provider_variant", { enabled: false, variant: "openai" });
    this.flags.set("knowledge_variant", { enabled: false, variant: "curated-v1" });
  }

  getFlag(name: string): ExperimentVariant {
    return this.flags.get(name) ?? { enabled: false, variant: "control" };
  }

  setFlag(name: string, value: ExperimentVariant): void {
    this.flags.set(name, value);
  }

  snapshot(): Record<string, ExperimentVariant> {
    return Object.fromEntries(this.flags.entries());
  }
}

export const experimentFramework = new ExperimentFramework();
