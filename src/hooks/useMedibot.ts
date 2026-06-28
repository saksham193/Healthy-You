import { useCallback, useEffect, useState } from "react";
import { sendMessage as sendAIMessage, syncConversationMemory } from "../services/ai/aiService";
import { createAITimingTrace, markAITiming } from "../services/ai/aiTiming";
import { medibotSessionStore } from "../services/ai/MedibotSessionStore";
import { useHealthStore } from "../store/healthStore";
import type { ConversationMessage } from "../types";

type UseMedibotOptions = {
  initialMessages: ConversationMessage[];
};

export function useMedibot({ initialMessages }: UseMedibotOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const loadHealthData = useHealthStore((state) => state.loadHealthData);
  const hasHealthData = useHealthStore(
    (state) => Boolean(state.healthScore && state.nutrition && state.fitness && state.sleep && state.schedule),
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      const storedMessages = await medibotSessionStore.loadRecentMessages();
      if (cancelled) return;

      const nextMessages = storedMessages.length > 0 ? storedMessages : initialMessages;

      setMessages(nextMessages);
      syncConversationMemory(nextMessages);
      setSessionHydrated(true);
    }

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [initialMessages]);

  useEffect(() => {
    if (!sessionHydrated || isLoading || isTyping) return;

    const timing = createAITimingTrace("medibot-session-save");
    markAITiming(timing, "session save", { awaited: false, messageCount: messages.length });
    void medibotSessionStore.saveRecentMessages(messages).catch(() => undefined);
  }, [isLoading, isTyping, messages, sessionHydrated]);

  useEffect(() => {
    if (!hasHealthData) {
      void loadHealthData();
    }
  }, [hasHealthData, loadHealthData]);

  const sendMessage = useCallback(async (message: string) => {
    const text = message.trim();

    if (!text) return;

    const timing = createAITimingTrace("medibot-ui-send");
    markAITiming(timing, "send start", { messageLength: text.length });
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      message: text,
    };

    setMessages((current) => [...current, userMessage]);
    markAITiming(timing, "user message state update");
    setError(null);
    setIsLoading(true);
    setIsTyping(true);

    try {
      const state = useHealthStore.getState();

      if (!state.healthScore || !state.nutrition || !state.fitness || !state.sleep || !state.schedule) {
        markAITiming(timing, "device sync check", { refreshed: false, backgroundRefreshQueued: true });
        void loadHealthData().catch(() => undefined);
      } else {
        markAITiming(timing, "device sync check", { refreshed: false, backgroundRefreshQueued: false });
      }

      const aiResponse = await sendAIMessage(text);
      markAITiming(timing, "service response received", {
        direct: Boolean(aiResponse.metadata?.metricDirectAnswerUsed),
      });
      const assistantMessage: ConversationMessage = {
        id: aiResponse.id,
        role: "assistant",
        message: aiResponse.response,
        metadata: aiResponse.metadata,
      };

      setMessages((current) => [...current, assistantMessage]);
      markAITiming(timing, "UI response commit", { responseId: assistantMessage.id });
      setSuggestions(aiResponse.suggestions);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to reach Medibot.");
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  }, [loadHealthData]);

  return {
    messages,
    loading: isLoading,
    isLoading,
    isTyping,
    error,
    sendMessage,
    suggestions,
  };
}
