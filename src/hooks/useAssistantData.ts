import { useCallback, useEffect, useState } from "react";
import { fetchAssistantData } from "../services/assistant/assistantService";
import type { AssistantData } from "../types";

export function useAssistantData() {
  const [data, setData] = useState<AssistantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchAssistantData();

      setData(response.data);
    } catch (serviceError) {
      setError(
        serviceError instanceof Error ? serviceError.message : "Unable to load Medibot data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
