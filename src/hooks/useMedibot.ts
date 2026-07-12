import { useCallback, useEffect, useState } from "react";
import { sendMessage as sendAIMessage, syncConversationMemory } from "../services/ai/aiService";
import { createAITimingTrace, markAITiming } from "../services/ai/aiTiming";
import { medibotSessionStore } from "../services/ai/MedibotSessionStore";
import {
  buildSafeMedibotFallbackResponse,
  getMedibotRuntimeStatus,
  sendBackendMedibotMessage,
  type MedibotRuntimeStatus,
} from "../services/ai/medibotRuntimeService";
import type { HealthAIContext } from "../services/ai/healthContext/HealthContextTypes";
import { useHealthStore } from "../store/healthStore";
import type { ConversationMessage } from "../types";

type UseMedibotOptions = {
  initialMessages: ConversationMessage[];
};

type SendMedibotOptions = {
  healthContext?: HealthAIContext;
};

export function useMedibot({ initialMessages }: UseMedibotOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<MedibotRuntimeStatus>({
    label: "Fallback",
    available: false,
  });
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

  useEffect(() => {
    let cancelled = false;

    async function refreshRuntimeStatus() {
      try {
        const status = await getMedibotRuntimeStatus();
        if (!cancelled) {
          setRuntimeStatus(status);
        }
      } catch {
        if (!cancelled) {
          setRuntimeStatus({ label: "Fallback", available: false });
        }
      }
    }

    void refreshRuntimeStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(async (message: string, options: SendMedibotOptions = {}) => {
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

      let aiResponse = await sendBackendMedibotMessage(text, "chat", options.healthContext);
      markAITiming(timing, "service response received", {
        runtimeMode: aiResponse.metadata?.runtimeMode,
        backendProvider: aiResponse.metadata?.backendProvider,
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
      setRuntimeStatus((current) => ({
        ...current,
        label: aiResponse.metadata?.backendProvider === "ollama" ? "Local" : aiResponse.metadata?.backendProvider === "mock" ? "Demo" : "Backend",
        provider: aiResponse.metadata?.backendProvider as MedibotRuntimeStatus["provider"],
        available: true,
      }));
    } catch {
      try {
        markAITiming(timing, "backend fallback start");
        const localResponse = await sendAIMessage(text);
        const fallbackMessage = [
          "I am using safe fallback mode right now. I can still share general wellness information, but this is not medical advice.",
          "This is general wellness information, not a medical diagnosis or treatment plan.",
          localResponse.response,
        ].join("\n\n");
        const assistantMessage: ConversationMessage = {
          id: `local-fallback-${localResponse.id}`,
          role: "assistant",
          message: fallbackMessage,
          metadata: {
            ...localResponse.metadata,
            fallback: true,
            offline: true,
            runtimeMode: "local",
            safetyNotice: "This is general wellness information, not a medical diagnosis or treatment plan.",
            healthContextUsed: Boolean(options.healthContext),
            healthContextScope: options.healthContext?.scope,
          },
        };

        setMessages((current) => [...current, assistantMessage]);
        setSuggestions(localResponse.suggestions);
        setRuntimeStatus({ label: "Fallback", available: false });
      } catch {
        const fallbackResponse = buildSafeMedibotFallbackResponse(text);
        const assistantMessage: ConversationMessage = {
          id: fallbackResponse.id,
          role: "assistant",
          message: fallbackResponse.response,
          metadata: {
            ...fallbackResponse.metadata,
            healthContextUsed: Boolean(options.healthContext),
            healthContextScope: options.healthContext?.scope,
          },
        };

        setMessages((current) => [...current, assistantMessage]);
        setSuggestions(fallbackResponse.suggestions);
        setRuntimeStatus({ label: "Fallback", available: false });
      }
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  }, [loadHealthData]);

  const appendAssistantMessage = useCallback((message: string, metadata?: ConversationMessage["metadata"]) => {
    const assistantMessage: ConversationMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      message,
      metadata,
    };

    setMessages((current) => [...current, assistantMessage]);
  }, []);

  return {
    messages,
    loading: isLoading,
    isLoading,
    isTyping,
    error,
    sendMessage,
    appendAssistantMessage,
    suggestions,
    runtimeStatus,
  };
}
