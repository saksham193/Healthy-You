import { env } from "../../config/env";
import type { STTProvider, STTProviderName } from "./STTProvider";
import { MockSTTProvider } from "./MockSTTProvider";

class UnavailableSTTProvider implements STTProvider {
  readonly model = undefined;

  constructor(readonly name: STTProviderName) {}

  isConfigured(): boolean {
    return false;
  }

  async checkAvailability(): Promise<boolean> {
    return false;
  }

  async transcribe(): Promise<never> {
    throw new Error("stt_provider_not_implemented");
  }
}

export const createSTTProvider = (providerName: STTProviderName): STTProvider => {
  switch (providerName) {
    case "mock":
      return new MockSTTProvider();
    default:
      return new UnavailableSTTProvider(providerName);
  }
};

export const getPrimarySTTProvider = (): STTProvider =>
  createSTTProvider(env.STT_PROVIDER);

export const getFallbackSTTProvider = (): STTProvider =>
  createSTTProvider(env.STT_FALLBACK_PROVIDER);
