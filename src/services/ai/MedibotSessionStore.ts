import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ConversationMessage } from "../../types";

const STORAGE_KEY = "healthy-you.medibot.recent-session";
const MAX_MESSAGES = 40;

type StoredMedibotSession = {
  storedAt: string;
  messages: ConversationMessage[];
};

const sensitivePatterns = [
  /\b(chest pain|can't breathe|cannot breathe|trouble breathing|severe bleeding|stroke|overdose|unconscious|emergency)\b/i,
  /\b(suicide|kill myself|self[-\s]?harm|hurt myself|harm(?:ing)? myself|end my life)\b/i,
  /\b(what dose|double dose|stop my medication|change my dose|increase my medication|decrease my medication)\b/i,
  /\b(diagnose|diabetes|cancer|what disease|is this cancer|tell me what condition)\b/i,
  /\bcannot diagnose symptoms or medical conditions\b/i,
  /\bcannot recommend medication dosages\b/i,
  /\burgent medical attention\b/i,
];

const isSensitiveMessage = (message: ConversationMessage): boolean =>
  message.id.startsWith("safety-") ||
  message.metadata?.safetyLevel === "urgent" ||
  sensitivePatterns.some((pattern) => pattern.test(message.message));

const sanitizeMessages = (messages: ConversationMessage[]): ConversationMessage[] =>
  messages
    .filter((message) => !isSensitiveMessage(message))
    .slice(-MAX_MESSAGES);

class MedibotSessionStore {
  async loadRecentMessages(): Promise<ConversationMessage[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as Partial<StoredMedibotSession>;

      return Array.isArray(parsed.messages) ? sanitizeMessages(parsed.messages) : [];
    } catch {
      await this.clear();

      return [];
    }
  }

  async saveRecentMessages(messages: ConversationMessage[]): Promise<void> {
    const sanitized = sanitizeMessages(messages);

    if (sanitized.length === 0) {
      await this.clear();
      return;
    }

    const session: StoredMedibotSession = {
      storedAt: new Date().toISOString(),
      messages: sanitized,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export const medibotSessionStore = new MedibotSessionStore();
