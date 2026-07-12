import { env } from "../../config/env";
import type { AIProviderName } from "../types";
import type { AIProvider } from "./AIProvider";
import { MockAIProvider } from "./MockAIProvider";
import { OllamaAIProvider } from "./OllamaAIProvider";

class UnavailableAIProvider implements AIProvider {
  readonly model = undefined;

  constructor(readonly name: AIProviderName) {}

  isConfigured(): boolean {
    return false;
  }

  async checkAvailability(): Promise<boolean> {
    return false;
  }

  async chat(): Promise<never> {
    throw new Error("ai_provider_not_implemented");
  }
}

export const createAIProvider = (providerName: AIProviderName): AIProvider => {
  switch (providerName) {
    case "mock":
      return new MockAIProvider();
    case "ollama":
      return new OllamaAIProvider();
    default:
      return new UnavailableAIProvider(providerName);
  }
};

export const getPrimaryAIProvider = (): AIProvider =>
  createAIProvider(env.AI_PROVIDER);

export const getFallbackAIProvider = (): AIProvider =>
  createAIProvider(env.AI_FALLBACK_PROVIDER);
