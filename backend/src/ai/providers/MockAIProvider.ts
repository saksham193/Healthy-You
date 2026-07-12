import type { AIChatRequest, AIChatResponse } from "../types";
import type { AIProvider } from "./AIProvider";

const getLatestUserMessage = (request: AIChatRequest): string =>
  [...request.messages].reverse().find((message) => message.role === "user")?.content ?? "";

export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;
  readonly model = "safe-demo";

  isConfigured(): boolean {
    return true;
  }

  async checkAvailability(): Promise<boolean> {
    return true;
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const userMessage = getLatestUserMessage(request);
    const mode = request.mode ?? "chat";
    const topic = userMessage.length > 0
      ? `For your ${mode} question, I can help you think through general wellness next steps.`
      : "I can help with general wellness questions and app guidance.";

    return {
      text: [
        "I am running in safe demo AI mode.",
        topic,
        "You can ask about habits, nutrition logging, fitness routines, sleep patterns, or questions to discuss with a qualified professional.",
      ].join(" "),
      provider: this.name,
      model: this.model,
      fallbackUsed: false,
    };
  }
}
