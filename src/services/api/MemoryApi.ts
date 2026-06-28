import type { MemoryRecord } from "../../types";
import { apiClient } from "./ApiClient";

export async function fetchMemories(): Promise<MemoryRecord[]> {
  return apiClient.get<MemoryRecord[]>("/memories", { authenticated: true });
}

export async function saveMemory(memory: MemoryRecord): Promise<MemoryRecord> {
  return apiClient.post<MemoryRecord>("/memories", memory, { authenticated: true });
}

export async function deleteMemory(id: string): Promise<void> {
  await apiClient.delete(`/memories/${encodeURIComponent(id)}`, { authenticated: true });
}
