import type { MemoryRecord } from "../types/api";
import { MemoryRepository } from "../repositories/MemoryRepository";

export class MemorySyncService {
  constructor(private readonly memories = new MemoryRepository()) {}

  list(userId: string): MemoryRecord[] {
    return this.memories.list(userId);
  }

  save(userId: string, memory: MemoryRecord): MemoryRecord {
    return this.memories.upsert(userId, memory);
  }

  delete(userId: string, id: string): void {
    this.memories.delete(userId, id);
  }
}
