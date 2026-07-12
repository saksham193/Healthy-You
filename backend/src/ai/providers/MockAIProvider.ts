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

const extractContextValue = (summary: string | undefined, label: string): string | undefined => {
  if (!summary) return undefined;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = summary.match(new RegExp(`${escaped}:\\s*([^\\n]+)`, "i"));

  return match?.[1]?.trim();
};

const hasContext = (summary: string | undefined): boolean =>
  Boolean(summary && /Steps today:|Meals logged today:|Workouts logged today:|Nutrition summary:|Fitness summary:|Routine summary:|Reminder summary:/i.test(summary));

const buildContextAwareReply = (userMessage: string, contextSummary: string | undefined): string | null => {
  if (!hasContext(contextSummary)) return null;

  const normalized = userMessage.toLowerCase();
  const steps = extractContextValue(contextSummary, "Steps today");
  const stepGoal = extractContextValue(contextSummary, "Step goal");
  const meals = extractContextValue(contextSummary, "Meals logged today");
  const calories = extractContextValue(contextSummary, "Calories logged today");
  const workouts = extractContextValue(contextSummary, "Workouts logged today");
  const activeMinutes = extractContextValue(contextSummary, "Active minutes today");
  const water = extractContextValue(contextSummary, "Water glasses today");
  const waterGoal = extractContextValue(contextSummary, "Water goal");
  const nutrition = extractContextValue(contextSummary, "Nutrition summary");
  const fitness = extractContextValue(contextSummary, "Fitness summary");
  const routine = extractContextValue(contextSummary, "Routine summary");
  const reminders = extractContextValue(contextSummary, "Reminder summary");

  if (/\b(step|steps|walked)\b/.test(normalized)) {
    return steps
      ? `Your Healthy You app context shows ${steps} steps today${stepGoal ? ` toward a goal of ${stepGoal}` : ""}. This data may be incomplete if you have not synced or logged everything yet.`
      : "I do not see a step count in the shared app context for today. If you enable device data or log activity, I can use that summary next time.";
  }

  if (/\b(ate|eat|meal|meals|nutrition|calorie|calories|food)\b/.test(normalized)) {
    return [
      meals ? `Your shared app context shows ${meals} meal${meals === "1" ? "" : "s"} logged today.` : "I do not see meals logged in today's shared app context.",
      calories ? `The logged calories are about ${calories}.` : "",
      nutrition ? nutrition : "",
    ].filter(Boolean).join(" ");
  }

  if (/\b(fitness|activity|workout|exercise|active)\b/.test(normalized)) {
    return [
      workouts ? `Your shared app context shows ${workouts} workout${workouts === "1" ? "" : "s"} logged today.` : "I do not see workouts logged in today's shared app context.",
      activeMinutes ? `That includes about ${activeMinutes} active minutes.` : "",
      fitness ? fitness : "",
    ].filter(Boolean).join(" ");
  }

  if (/\b(routine|reminder|schedule|habit)\b/.test(normalized)) {
    return [
      routine ?? "I do not see custom routines in the shared app context.",
      reminders ?? "",
    ].filter(Boolean).join(" ");
  }

  if (/\b(habit|focus|summary|summarize|based on)\b/.test(normalized)) {
    return [
      "Based on the minimized app context, a gentle focus could be consistency across the basics you are already tracking.",
      steps ? `Steps: ${steps}.` : "",
      meals ? `Meals logged: ${meals}.` : "",
      workouts ? `Workouts logged: ${workouts}.` : "",
      water ? `Water: ${water}${waterGoal ? ` of ${waterGoal} glasses` : " glasses"}.` : "",
      "Use this as general wellness reflection, not medical advice.",
    ].filter(Boolean).join(" ");
  }

  return null;
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

    const contextReply = buildContextAwareReply(userMessage, request.healthContextSummary);
    if (contextReply) {
      return {
        text: [
          "I am running in safe demo AI mode.",
          contextReply,
        ].join(" "),
        provider: this.name,
        model: this.model,
        fallbackUsed: false,
      };
    }

    if (/\b(step|steps|what did i eat|ate today|meal|meals|workout|activity|routine|reminder)\b/i.test(userMessage)) {
      return {
        text: [
          "I am running in safe demo AI mode.",
          "I do not have app health context for this message.",
          "Turn on health context in Medibot when you want me to use a small summary of today's logged app data.",
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
