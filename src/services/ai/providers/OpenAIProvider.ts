import { sendAIRequest } from "../../api/AIApi";
import type { AIRequest, ProviderResponse } from "../../../types";
import { generateRecommendations } from "../recommendationEngine";
import type { AIProvider } from "./AIProvider";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  async sendMessage(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }

  async generateHealthResponse(request: AIRequest): Promise<ProviderResponse> {
    const response = await sendAIRequest(request);
    const fallbackSuggestions = generateRecommendations(request.context, request.intent).map(
      (recommendation) => recommendation.message,
    );

    return {
      ...response,
      suggestions: response.suggestions.length > 0 ? response.suggestions : fallbackSuggestions,
      provider: this.name,
      metadata: {
        ...response.metadata,
        source: "cloud",
      },
    };
  }

  async generateRecommendation(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }
}
