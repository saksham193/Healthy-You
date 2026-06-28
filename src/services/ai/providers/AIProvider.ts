import type { AIRequest, ProviderResponse } from "../../../types";

export interface AIProvider {
  readonly name: "mock" | "openai" | "offline";
  sendMessage(request: AIRequest): Promise<ProviderResponse>;
  generateHealthResponse(request: AIRequest): Promise<ProviderResponse>;
  generateRecommendation(request: AIRequest): Promise<ProviderResponse>;
}
