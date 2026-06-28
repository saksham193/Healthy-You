import type { AIProvider } from "./AIProvider";
import { MockAIProvider } from "./MockAIProvider";
import { OfflineAIProvider } from "./OfflineAIProvider";
import { OpenAIProvider } from "./OpenAIProvider";

declare const process: {
  env?: {
    EXPO_PUBLIC_AI_PROVIDER?: string;
  };
};

const mockProvider = new MockAIProvider();
const offlineProvider = new OfflineAIProvider();

export function getAIProvider(): AIProvider {
  const configuredProvider = process.env?.EXPO_PUBLIC_AI_PROVIDER?.toLowerCase();

  if (configuredProvider === "openai") {
    return new OpenAIProvider();
  }

  return mockProvider;
}

export function getMockAIProvider(): AIProvider {
  return mockProvider;
}

export function getOfflineAIProvider(): AIProvider {
  return offlineProvider;
}
