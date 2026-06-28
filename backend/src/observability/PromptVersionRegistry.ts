import type { VersionMetadata } from "./TelemetryTypes";

export class PromptVersionRegistry {
  private versions: VersionMetadata = {
    promptVersion: "medibot-mobile-prompt-v1",
    ragVersion: "medical-rag-v2-governed",
    knowledgeVersion: "curated-health-knowledge-v1",
    providerVersion: "openai-proxy-v1",
    responseVersion: "ai-response-metadata-v2",
    orchestratorVersion: "health-orchestrator-v1",
  };

  getVersions(): VersionMetadata {
    return { ...this.versions };
  }

  setVariant(overrides: Partial<VersionMetadata>): VersionMetadata {
    this.versions = { ...this.versions, ...overrides };

    return this.getVersions();
  }
}

export const promptVersionRegistry = new PromptVersionRegistry();
