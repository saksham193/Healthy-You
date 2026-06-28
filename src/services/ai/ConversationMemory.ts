import type { ConversationMemoryItem, ConversationMessage } from "../../types";

const MAX_MESSAGES = 30;

class ConversationMemory {
  private items: ConversationMemoryItem[] = [];

  add(role: ConversationMemoryItem["role"], message: string, id = `${role}-${Date.now()}`): void {
    this.items = [
      ...this.items,
      {
        id,
        role,
        message,
        createdAt: Date.now(),
      },
    ].slice(-MAX_MESSAGES);
  }

  replace(messages: ConversationMessage[]): void {
    this.items = messages.slice(-MAX_MESSAGES).map((message, index) => ({
      id: message.id,
      role: message.role,
      message: message.message,
      createdAt: Date.now() - (messages.length - index),
    }));
  }

  getMessages(): ConversationMemoryItem[] {
    return [...this.items];
  }
}

export const conversationMemory = new ConversationMemory();
