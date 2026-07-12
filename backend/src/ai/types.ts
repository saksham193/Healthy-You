export type AIProviderName =
  | "mock"
  | "ollama"
  | "gemini"
  | "groq"
  | "openrouter"
  | "huggingface"
  | "openai";

export type AIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatMode = "chat" | "nutrition" | "fitness" | "schedule" | "data-insight";

export type AIChatRequest = {
  messages: AIChatMessage[];
  healthContextSummary?: string;
  mode?: AIChatMode;
};

export type AIChatResponse = {
  text: string;
  provider: AIProviderName;
  model?: string;
  fallbackUsed: boolean;
  safetyNotice?: string;
};

export type AIProviderStatus = {
  provider: AIProviderName;
  available: boolean;
  fallbackProvider: AIProviderName;
  safetyGuardEnabled: boolean;
  mode: "development-safe" | "local" | "not-configured";
};
