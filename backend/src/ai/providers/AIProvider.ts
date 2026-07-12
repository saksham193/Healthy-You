import type { AIChatRequest, AIChatResponse, AIProviderName } from "../types";

export interface AIProvider {
  readonly name: AIProviderName;
  readonly model?: string;
  isConfigured(): boolean;
  checkAvailability(): Promise<boolean>;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
}
