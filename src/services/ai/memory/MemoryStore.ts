import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MemoryRecord } from "../types";

const MEMORY_KEY = "healthy-you.ai.long-term-memory";

const isMemoryRecord = (value: unknown): value is MemoryRecord => {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Partial<Record<keyof MemoryRecord, unknown>>;

  return (
    typeof record.id === "string" &&
    typeof record.category === "string" &&
    typeof record.value === "string" &&
    typeof record.sourceMessage === "string" &&
    typeof record.confidence === "number" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
};

export type MemoryPersistence = {
  read(): Promise<MemoryRecord[]>;
  write(records: MemoryRecord[]): Promise<void>;
};

export class AsyncStorageMemoryStore implements MemoryPersistence {
  async read(): Promise<MemoryRecord[]> {
    const raw = await AsyncStorage.getItem(MEMORY_KEY);

    if (!raw) return [];

    try {
      const parsed: unknown = JSON.parse(raw);

      return Array.isArray(parsed) ? parsed.filter(isMemoryRecord) : [];
    } catch {
      return [];
    }
  }

  async write(records: MemoryRecord[]): Promise<void> {
    await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(records));
  }
}

export const memoryStore = new AsyncStorageMemoryStore();
