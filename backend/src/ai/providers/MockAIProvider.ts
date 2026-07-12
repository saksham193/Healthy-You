import type { AIChatRequest, AIChatResponse } from "../types";
import type { AIProvider } from "./AIProvider";

const getLatestUserMessage = (request: AIChatRequest): string =>
  [...request.messages].reverse().find((message) => message.role === "user")?.content ?? "";

const getAttachmentTopics = (message: string): string[] => {
  const normalized = message.toLowerCase();
  const topics: string[] = [];

  const detectors: Array<[string, RegExp]> = [
    ["hydration", /\b(water|hydration|fluid)\b/],
    ["nutrition", /\b(meal|food|calorie|protein|carb|fat|diet)\b/],
    ["fitness", /\b(walk|steps|workout|exercise|routine|run)\b/],
    ["sleep", /\b(sleep|bedtime|rest|fatigue)\b/],
    ["medication questions", /\b(medicine|medication|dose|prescription|pill)\b/],
  ];

  detectors.forEach(([label, pattern]) => {
    if (pattern.test(normalized)) {
      topics.push(label);
    }
  });

  return topics.slice(0, 3);
};

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
    const isAttachmentSummary = userMessage.includes("Attachment text for summary:");

    if (isAttachmentSummary) {
      const topics = getAttachmentTopics(userMessage);
      const topicCopy = topics.length > 0
        ? `The attachment appears to mention ${topics.join(", ")}.`
        : "The attachment appears to contain text notes that can be reviewed in plain language.";

      return {
        text: [
          "I am running in safe demo AI mode.",
          topicCopy,
          "Use this as a general summary only, and consider asking a qualified professional about anything clinical, urgent, or medication-related.",
        ].join(" "),
        provider: this.name,
        model: this.model,
        fallbackUsed: false,
      };
    }

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
