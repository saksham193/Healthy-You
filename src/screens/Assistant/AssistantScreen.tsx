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
import {
  AI_ATTACHMENT_ANALYSIS_UNAVAILABLE_MESSAGE,
  analyzeMedibotAttachment,
  type AttachmentAnalysisResult,
} from "../../services/api/AIApi";
import { ApiRequestError } from "../../services/api/ApiClient";
import { connectivityService } from "../../services/connectivity/ConnectivityService";
import type { ConnectivityStatus } from "../../services/connectivity/ConnectivityStatus";
import { formatBytes, pickMedibotAttachment } from "../../services/media/documentPickerService";
import { getVoiceInputFoundationStatus } from "../../services/media/voiceInputFoundation";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { RootTabParamList } from "../../types";
import type { PickedAttachment } from "../../services/media/mediaTypes";

type AssistantScreenProps = BottomTabScreenProps<RootTabParamList, "Chat">;

export default function AssistantScreen({ route }: AssistantScreenProps) {
  const { data, error, loading: assistantLoading } = useAssistantData();
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>(() => connectivityService.getStatus());
  const initialMessages = useMemo(() => data?.conversation ?? [], [data?.conversation]);
  const {
    messages,
    loading: medibotLoading,
    isTyping,
    error: medibotError,
    sendMessage,
    appendAssistantMessage,
    suggestions,
    runtimeStatus,
  } = useMedibot({
    initialMessages,
  });
  const [draft, setDraft] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<PickedAttachment | null>(null);
  const [attachmentAnalysis, setAttachmentAnalysis] = useState<AttachmentAnalysisResult | null>(null);
  const [attachmentAnalysisMessage, setAttachmentAnalysisMessage] = useState<string | null>(null);
  const [attachmentAnalyzing, setAttachmentAnalyzing] = useState(false);
  const [transientBotState, setTransientBotState] = useState<MedibotAnimationState | null>(null);
  const transientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingStartedAt = useRef<number | null>(null);
  const lastAssistantMessageId = useRef<string | null>(null);
  const messagesInitialized = useRef(false);
  const hasConversation = messages.length > 0;
  const isOffline = !connectivity.isOnline;
  const attachmentAnalyzed = Boolean(attachmentAnalysis?.supported);
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
    void pickMedibotAttachment().then((result) => {
      if (!result.ok) {
        if (result.reason !== "cancelled") {
          Alert.alert("Attachment unavailable", result.message);
        }
        return;
      }

      setSelectedAttachment(result.asset);
      setAttachmentAnalysis(null);
      setAttachmentAnalysisMessage(null);
      Alert.alert(
        "Attachment selected",
        "Attachment selected for local review. This file has not been uploaded or analyzed yet.",
      );
    });
  };
  const runAttachmentAnalysis = async (attachment: PickedAttachment) => {
    setAttachmentAnalyzing(true);
    setAttachmentAnalysis(null);
    setAttachmentAnalysisMessage(null);
    showTransientBotState("thinking", 1400);

    try {
      const result = await analyzeMedibotAttachment(attachment);
      setAttachmentAnalysis(result);
      setAttachmentAnalysisMessage(null);
      appendAssistantMessage(
        [
          result.supported ? "Attachment summary:" : "Attachment analysis:",
          result.summary,
          result.safetyNotice,
        ].join("\n\n"),
        {
          backendProvider: result.provider,
          backendFallbackUsed: result.fallbackUsed,
          backendRequestId: result.requestId,
          fallback: result.fallbackUsed,
          runtimeMode: "backend",
          safetyNotice: result.safetyNotice,
          source: result.provider === "mock" ? "mock" : "cloud",
        },
      );
      showTransientBotState("talking", 1600);
    } catch (analysisError) {
      const message = analysisError instanceof ApiRequestError
        ? analysisError.message
        : AI_ATTACHMENT_ANALYSIS_UNAVAILABLE_MESSAGE;

      setAttachmentAnalysis(null);
      setAttachmentAnalysisMessage(message);
      appendAssistantMessage(
        [
          message,
          "AI summaries are for general wellness support only and are not medical advice.",
        ].join("\n\n"),
        {
          fallback: true,
          runtimeMode: "fallback",
          safetyNotice: "AI summaries are for general wellness support only and are not medical advice.",
          source: "mock",
        },
      );
      showTransientBotState("notification", 1500);
    } finally {
      setAttachmentAnalyzing(false);
    }
  };
  const handleAnalyzeAttachmentPress = () => {
    if (!selectedAttachment || attachmentAnalyzing) return;

    Alert.alert(
      "Analyze attachment",
      "Attachment analysis uploads this selected file to the Healthy You backend for processing. Do not upload sensitive documents unless you understand and accept this. AI summaries are for general wellness support only and are not medical advice.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Analyze",
          onPress: () => {
            if (selectedAttachment) void runAttachmentAnalysis(selectedAttachment);
          },
        },
      ],
    );
  };
  const handleVoicePress = () => {
    const status = getVoiceInputFoundationStatus();
    showTransientBotState(status.state === "unavailable" ? "notification" : "listening", 1800);
    Alert.alert(status.title, `${status.message}\n\n${status.safetyNote}`);
  };
  const handleVoiceNotify = () => {
    showTransientBotState("notification", 1500);
    Alert.alert(
      "Voice input",
      "Voice input is not available in this build. Healthy You will not record audio, upload audio, or send a transcript automatically. Medibot text chat is available now.",
    );
  };
  const canSend = draft.trim().length > 0 && !medibotLoading;

  useEffect(() => {
    const initialPrompt = route.params?.initialPrompt?.trim();
    if (initialPrompt) {
      setDraft(initialPrompt);
    }
  }, [route.params?.initialPrompt]);

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
              <Text numberOfLines={1} style={styles.modeText}>AI mode: {isOffline ? "Fallback" : runtimeStatus.label}</Text>
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
                      ? "Loading your assistant."
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

          {selectedAttachment ? (
            <View style={styles.attachmentBanner}>
              <View style={styles.attachmentIcon}>
                <Ionicons color={COLORS.primary} name="document-attach-outline" size={18} />
              </View>
              <View style={styles.attachmentCopy}>
                <Text numberOfLines={1} style={styles.attachmentName}>{selectedAttachment.name}</Text>
                <Text numberOfLines={1} style={styles.attachmentMeta}>
                  {selectedAttachment.mimeType} - {formatBytes(selectedAttachment.size)} - {attachmentAnalyzed ? "analyzed" : "not uploaded"}
                </Text>
                <Text numberOfLines={2} style={styles.attachmentSafety}>
                  {attachmentAnalyzed
                    ? "Uploaded and analyzed after consent. Remove the attachment when you are done."
                    : "This file has not been uploaded or analyzed yet. Choose Analyze to continue."}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Analyze selected attachment"
                accessibilityRole="button"
                activeOpacity={0.78}
                disabled={attachmentAnalyzing}
                onPress={handleAnalyzeAttachmentPress}
                style={[styles.attachmentAnalyzeButton, attachmentAnalyzing && styles.attachmentAnalyzeButtonDisabled]}
              >
                <Text numberOfLines={1} style={styles.attachmentAnalyzeText}>
                  {attachmentAnalyzing ? "Analyzing" : attachmentAnalyzed ? "Analyze again" : "Analyze"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Remove selected attachment"
                accessibilityRole="button"
                activeOpacity={0.78}
                disabled={attachmentAnalyzing}
                onPress={() => {
                  setSelectedAttachment(null);
                  setAttachmentAnalysis(null);
                  setAttachmentAnalysisMessage(null);
                }}
                style={styles.attachmentRemoveButton}
              >
                <Ionicons color={COLORS.textMuted} name="close-outline" size={18} />
              </TouchableOpacity>
            </View>
          ) : null}

          {attachmentAnalysis || attachmentAnalysisMessage ? (
            <View style={styles.attachmentResultCard}>
              <View style={styles.attachmentResultHeader}>
                <Ionicons color={COLORS.primary} name="sparkles-outline" size={18} />
                <Text style={styles.attachmentResultTitle}>
                  {attachmentAnalysis ? "Attachment summary" : "Attachment analysis"}
                </Text>
              </View>
              <Text style={styles.attachmentResultText}>
                {attachmentAnalysis?.summary ?? attachmentAnalysisMessage}
              </Text>
              {attachmentAnalysis ? (
                <>
                  <Text style={styles.attachmentResultSafety}>{attachmentAnalysis.safetyNotice}</Text>
                  {(attachmentAnalysis.limitations ?? []).map((limitation) => (
                    <Text key={limitation} style={styles.attachmentLimitation}>- {limitation}</Text>
                  ))}
                </>
              ) : (
                <Text style={styles.attachmentResultSafety}>
                  AI summaries are for general wellness support only and are not medical advice.
                </Text>
              )}
            </View>
          ) : null}

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
  modeText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.xs,
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
  attachmentBanner: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  attachmentIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  attachmentCopy: {
    flex: 1,
    minWidth: 0,
  },
  attachmentName: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  attachmentMeta: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  attachmentSafety: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  attachmentAnalyzeButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.md,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: SPACING.md,
  },
  attachmentAnalyzeButtonDisabled: {
    opacity: 0.6,
  },
  attachmentAnalyzeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  attachmentRemoveButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.md,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  attachmentResultCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    padding: SPACING.md,
  },
  attachmentResultHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  attachmentResultTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  attachmentResultText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 19,
  },
  attachmentResultSafety: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 17,
  },
  attachmentLimitation: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 17,
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
