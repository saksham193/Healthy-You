import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ConversationBubble from "../../components/chat/ConversationBubble";
import ConversationHistoryCard from "../../components/chat/ConversationHistoryCard";
import MedicalDisclaimerCard from "../../components/chat/MedicalDisclaimerCard";
import QuickActionChip from "../../components/chat/QuickActionChip";
import SuggestedPromptChip from "../../components/chat/SuggestedPromptChip";
import VoiceAssistantCard from "../../components/chat/VoiceAssistantCard";
import AnimatedMedibot, { type MedibotAnimationState } from "../../components/medibot/AnimatedMedibot";
import CustomCard from "../../components/common/CustomCard";
import EmptyState from "../../components/layout/EmptyState";
import ScreenContainer from "../../components/common/ScreenContainer";
import AppHeader from "../../components/layout/AppHeader";
import DashboardSection from "../../components/layout/DashboardSection";
import ScreenSheet from "../../components/layout/ScreenSheet";
import { useAssistantData } from "../../hooks/useAssistantData";
import { useMedibot } from "../../hooks/useMedibot";
import { connectivityService } from "../../services/connectivity/ConnectivityService";
import type { ConnectivityStatus } from "../../services/connectivity/ConnectivityStatus";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
export default function AssistantScreen() {
  const { data, error, loading: assistantLoading } = useAssistantData();
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>(() => connectivityService.getStatus());
  const initialMessages = useMemo(() => data?.conversation ?? [], [data?.conversation]);
  const {
    messages,
    loading: medibotLoading,
    isTyping,
    error: medibotError,
    sendMessage,
    suggestions,
  } = useMedibot({
    initialMessages,
  });
  const [draft, setDraft] = useState("");
  const [transientBotState, setTransientBotState] = useState<MedibotAnimationState | null>(null);
  const transientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingStartedAt = useRef<number | null>(null);
  const lastAssistantMessageId = useRef<string | null>(null);
  const messagesInitialized = useRef(false);
  const hasConversation = messages.length > 0;
  const isOffline = !connectivity.isOnline;
  const botState: MedibotAnimationState = transientBotState ?? (medibotLoading || isTyping ? "thinking" : "idle");

  useEffect(() => connectivityService.subscribe(setConnectivity), []);
  useEffect(() => () => {
    if (transientTimer.current) clearTimeout(transientTimer.current);
    if (talkTimer.current) clearTimeout(talkTimer.current);
  }, []);

  const showTransientBotState = (state: MedibotAnimationState, durationMs: number) => {
    if (transientTimer.current) clearTimeout(transientTimer.current);
    setTransientBotState(state);
    transientTimer.current = setTimeout(() => setTransientBotState(null), durationMs);
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;

    thinkingStartedAt.current = Date.now();
    showTransientBotState("thinking", 1200);
    void sendMessage(text);
    setDraft("");
  };
  const handleAssistantAction = (title: string) => {
    setDraft(`Help me with ${title.toLowerCase()}.`);
  };
  const handleAttachmentPress = () => {
    Alert.alert("Attachment", "File attachments are not available in this workspace yet.");
  };
  const handleVoicePress = () => {
    showTransientBotState("listening", 1800);
    Alert.alert("Voice input", "Voice capture is not enabled for this build.");
  };
  const handleVoiceNotify = () => {
    showTransientBotState("notification", 1500);
    Alert.alert("Voice Assistant", "Voice assistant alerts are enabled for your next update.");
  };
  const canSend = draft.trim().length > 0 && !medibotLoading;

  useEffect(() => {
    const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
    if (!latestAssistantMessage) return;

    if (!messagesInitialized.current) {
      messagesInitialized.current = true;
      lastAssistantMessageId.current = latestAssistantMessage.id;
      return;
    }

    if (latestAssistantMessage.id !== lastAssistantMessageId.current) {
      lastAssistantMessageId.current = latestAssistantMessage.id;
      const elapsedThinkingMs = thinkingStartedAt.current ? Date.now() - thinkingStartedAt.current : 1200;
      const talkingDelayMs = Math.max(0, 900 - elapsedThinkingMs);
      if (talkTimer.current) clearTimeout(talkTimer.current);
      talkTimer.current = setTimeout(() => {
        thinkingStartedAt.current = null;
        showTransientBotState("talking", 1600);
      }, talkingDelayMs);
    }
  }, [messages]);

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <AppHeader
          subtitle="Your Personal Health Assistant"
          theme={{
            actionBackgroundColor: "rgba(5, 45, 78, 0.10)",
            backgroundColor: COLORS.brandAqua,
            foregroundColor: COLORS.purpleInk,
            glowAccentColor: COLORS.brandDeepBlue,
            glowColor: COLORS.brandCyan,
            subtitleColor: COLORS.purpleInk,
          }}
          title="Medibot"
        >
          <CustomCard style={styles.statusCard}>
            <View style={styles.botIcon}>
              <AnimatedMedibot
                accessibilityLabel={`Medibot assistant ${botState}`}
                size={44}
                state={botState}
              />
            </View>
            <View style={styles.statusCopy}>
              <Text numberOfLines={1} style={styles.statusTitle}>Medibot status</Text>
              <View style={styles.statusRow}>
                <View style={[styles.pulseDot, isOffline && styles.offlineDot]} />
                <Text numberOfLines={1} style={styles.statusText}>{isOffline ? "Offline" : "Online"}</Text>
              </View>
            </View>
          </CustomCard>
        </AppHeader>

        <ScreenSheet style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.conversationContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
          >
            <DashboardSection title="Conversation History" />
            {data?.history.length ? (
              <View style={styles.list}>
                {data.history.map((item) => (
                  <ConversationHistoryCard item={item} key={item.id} />
                ))}
              </View>
            ) : (
              <CustomCard style={styles.emptyCard}>
                <EmptyState
                  icon="chatbubble-ellipses-outline"
                  loading={assistantLoading}
                  subtitle="Your recent Medibot conversations will appear here."
                  title="No conversation history"
                />
              </CustomCard>
            )}

            <DashboardSection title="Medibot Chat" />
            {hasConversation ? (
              <View style={styles.messages}>
                {messages.map((item) => (
                  <ConversationBubble key={item.id} message={item} />
                ))}
                {isTyping ? <Text style={styles.thinkingText}>Medibot is thinking...</Text> : null}
                {medibotError ? <Text style={styles.errorText}>{medibotError}</Text> : null}
              </View>
            ) : (
              <CustomCard style={styles.welcomeCard}>
                <EmptyState
                  icon={error ? "alert-circle-outline" : "sparkles-outline"}
                  loading={!error && assistantLoading}
                  subtitle={
                    error ??
                    (assistantLoading
                      ? "Loading your assistant workspace."
                      : "Analyze my sleep, suggest a workout, improve my diet, or explain my blood pressure.")
                  }
                  title={error ? "Unable to load Medibot" : "How can Medibot help today?"}
                />
              </CustomCard>
            )}

            <DashboardSection title="Suggested Prompts" />
            {data?.prompts.length ? (
              <View style={styles.promptWrap}>
                {data.prompts.map((prompt) => (
                  <SuggestedPromptChip key={prompt.id} onPress={setDraft} prompt={prompt} />
                ))}
              </View>
            ) : (
              <CustomCard style={styles.emptyCard}>
                <EmptyState
                  icon="sparkles-outline"
                  loading={assistantLoading}
                  subtitle="Prompt ideas will appear when assistant data is ready."
                  title="No suggested prompts"
                />
              </CustomCard>
            )}
            {suggestions.length > 0 ? (
              <View style={styles.promptWrap}>
                {suggestions.map((suggestion) => (
                  <SuggestedPromptChip
                    key={suggestion}
                    onPress={setDraft}
                    prompt={{ id: suggestion, label: suggestion }}
                  />
                ))}
              </View>
            ) : null}

            <DashboardSection title="Health Quick Actions" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActions}
            >
              {data?.quickActions.length ? (
                data.quickActions.map((action) => (
                  <QuickActionChip action={action} key={action.id} onPress={handleAssistantAction} />
                ))
              ) : (
                <CustomCard style={styles.emptyActionCard}>
                  <EmptyState
                    icon="flash-outline"
                    loading={assistantLoading}
                    subtitle="Assistant shortcuts will appear here."
                    title="No quick actions"
                  />
                </CustomCard>
              )}
            </ScrollView>

            <DashboardSection title="Voice Assistant" />
            <VoiceAssistantCard onNotify={handleVoiceNotify} />

            <DashboardSection title="Medical Disclaimer" />
            <MedicalDisclaimerCard />
          </ScrollView>

          <View style={styles.inputBar}>
            <TouchableOpacity
              accessibilityLabel="Attach file"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={handleAttachmentPress}
              style={styles.iconButton}
            >
              <Ionicons color={COLORS.primary} name="attach-outline" size={22} />
            </TouchableOpacity>
            <TextInput
              accessibilityLabel="Ask Medibot"
              multiline
              onChangeText={setDraft}
              placeholder="Ask Medibot anything..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={draft}
            />
            <TouchableOpacity
              accessibilityLabel="Start voice input"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={handleVoicePress}
              style={styles.iconButton}
            >
              <Ionicons color={COLORS.primary} name="mic-outline" size={22} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Send message"
              accessibilityRole="button"
              activeOpacity={0.85}
              disabled={!canSend}
              onPress={handleSend}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            >
              <Ionicons
                color={COLORS.white}
                name={medibotLoading ? "hourglass-outline" : "send"}
                size={18}
              />
            </TouchableOpacity>
          </View>
        </ScreenSheet>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    minHeight: 0,
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  statusCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  botIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.xl,
    height: SPACING.xxxl + SPACING.xxl,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.xxl,
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  pulseDot: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.accentLight,
    borderRadius: SPACING.sm,
    borderWidth: 3,
    height: SPACING.lg,
    width: SPACING.lg,
  },
  offlineDot: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warningLight,
  },
  statusText: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  conversationContent: {
    paddingBottom: SPACING.xl,
  },
  list: {
    gap: SPACING.md,
  },
  messages: {
    gap: SPACING.md,
  },
  thinkingText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  welcomeCard: {
    padding: 0,
  },
  emptyCard: {
    padding: 0,
  },
  emptyActionCard: {
    marginRight: SPACING.md,
    padding: 0,
    width: 220,
  },
  promptWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  quickActions: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  inputBar: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: SPACING.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    ...SHADOWS.medium,
  },
  input: {
    color: COLORS.text,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.lineHeights.md,
    maxHeight: 108,
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    textAlignVertical: "center",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.md,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.md,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.md,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.md,
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
});
