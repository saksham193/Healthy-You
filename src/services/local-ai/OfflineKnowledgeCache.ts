import type { OfflineIntent, OfflineKnowledgeItem } from "./types";

const items: OfflineKnowledgeItem[] = [
  {
    id: "hydration-basics",
    category: "hydration",
    title: "Hydration basics",
    summary: "Steady fluid intake through the day is usually easier to maintain than catching up all at once.",
    keywords: ["water", "hydration", "drink", "thirst"],
  },
  {
    id: "sleep-hygiene",
    category: "sleep",
    title: "Sleep hygiene",
    summary: "A consistent sleep window, calmer wind-down, and lower evening stimulation can support better sleep routines.",
    keywords: ["sleep", "bedtime", "tired", "fatigue", "insomnia"],
  },
  {
    id: "balanced-nutrition",
    category: "nutrition",
    title: "Balanced nutrition",
    summary: "Balanced meals often combine protein, vegetables or fruit, fiber-rich carbohydrates, and healthy fats.",
    keywords: ["meal", "diet", "nutrition", "protein", "calorie"],
  },
  {
    id: "safe-exercise",
    category: "exercise",
    title: "Safe exercise",
    summary: "Increase activity gradually, keep recovery in the plan, and stop if you feel chest pain, faintness, or severe breathlessness.",
    keywords: ["workout", "exercise", "steps", "activity", "heart rate"],
  },
  {
    id: "medication-adherence",
    category: "medication",
    title: "Medication adherence reminders",
    summary: "Reminders, visible routines, and pharmacist guidance can help with missed doses without changing prescribed amounts.",
    keywords: ["medication", "medicine", "pill", "dose", "missed"],
  },
  {
    id: "device-sync-help",
    category: "device",
    title: "Device sync help",
    summary: "Offline or stale device data can limit personalization until permissions and sync are refreshed.",
    keywords: ["device", "sync", "watch", "permission", "stale"],
  },
];

const intentCategory: Partial<Record<OfflineIntent, OfflineKnowledgeItem["category"]>> = {
  hydration: "hydration",
  sleep: "sleep",
  nutrition: "nutrition",
  fitness: "exercise",
  medication: "medication",
  device_status: "device",
};

export class OfflineKnowledgeCache {
  getByIntent(intent: OfflineIntent): OfflineKnowledgeItem[] {
    const category = intentCategory[intent];

    if (!category) return [];

    return items.filter((item) => item.category === category);
  }

  search(message: string, intent: OfflineIntent): OfflineKnowledgeItem[] {
    const normalized = message.toLowerCase();
    const intentItems = this.getByIntent(intent);
    const keywordItems = items.filter((item) =>
      item.keywords.some((keyword) => normalized.includes(keyword)),
    );
    const combined = [...intentItems, ...keywordItems];
    const byId = new Map(combined.map((item) => [item.id, item]));

    return Array.from(byId.values()).slice(0, 3);
  }

  all(): OfflineKnowledgeItem[] {
    return items;
  }
}

export const offlineKnowledgeCache = new OfflineKnowledgeCache();
