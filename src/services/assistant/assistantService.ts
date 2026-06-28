import {
  medibotConversation,
  medibotHistory,
  medibotPrompts,
  medibotQuickActions,
} from "../../constants/mockData";
import type { AssistantData, HealthServiceResponse } from "../../types";

const createResponse = async <T>(data: T): Promise<HealthServiceResponse<T>> => ({
  data,
  fetchedAt: new Date().toISOString(),
});

export async function fetchAssistantData(): Promise<HealthServiceResponse<AssistantData>> {
  return createResponse({
    prompts: medibotPrompts,
    quickActions: medibotQuickActions,
    history: medibotHistory,
    conversation: medibotConversation,
  });
}
