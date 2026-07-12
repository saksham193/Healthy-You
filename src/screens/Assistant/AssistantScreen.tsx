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
  transcribeMedibotVoiceClip,
  type AttachmentAnalysisResult,
  type VoiceTranscriptionResult,
} from "../../services/api/AIApi";
import { ApiRequestError } from "../../services/api/ApiClient";
import { connectivityService } from "../../services/connectivity/ConnectivityService";
import type { ConnectivityStatus } from "../../services/connectivity/ConnectivityStatus";
import { buildHealthAIContext } from "../../services/ai/healthContext/HealthContextBuilder";
import {
  HEALTH_CONTEXT_USER_COPY,
  type HealthAIContext,
} from "../../services/ai/healthContext/HealthContextTypes";
import { formatBytes, pickMedibotAttachment } from "../../services/media/documentPickerService";
import { getVoiceInputFoundationStatus } from "../../services/media/voiceInputFoundation";
import {
  cancelActiveVoiceRecording,
  requestVoiceRecordingPermission,
  startVoiceRecording,
  stopVoiceRecording,
  VOICE_RECORDING_MAX_DURATION_SECONDS,
  type VoiceRecordingClip,
} from "../../services/media/voiceRecordingService";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { RootTabParamList } from "../../types";
import type { PickedAttachment } from "../../services/media/mediaTypes";

type AssistantScreenProps = BottomTabScreenProps<RootTabParamList, "Chat">;
type VoiceFlowState = "closed" | "unavailable" | "ready" | "recording" | "recorded" | "transcribing" | "transcript" | "failed";

const VOICE_TRANSCRIPT_REVIEW_NOTICE = "Review and edit the transcript before sending it to Medibot.";
const VOICE_LOCAL_FALLBACK_TRANSCRIPT =
  "Voice transcription is unavailable right now. Please edit this text or type your message before sending it to Medibot.";

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
  const [voiceState, setVoiceState] = useState<VoiceFlowState>("closed");
  const [voiceClip, setVoiceClip] = useState<VoiceRecordingClip | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceTranscription, setVoiceTranscription] = useState<VoiceTranscriptionResult | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [healthContextEnabled, setHealthContextEnabled] = useState(false);
  const [healthContextBuilding, setHealthContextBuilding] = useState(false);
  const [healthContextMessage, setHealthContextMessage] = useState<string | null>(null);
  const [transientBotState, setTransientBotState] = useState<MedibotAnimationState | null>(null);
  const transientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingStartedAt = useRef<number | null>(null);
  const lastAssistantMessageId = useRef<string | null>(null);
  const messagesInitialized = useRef(false);
  const hasConversation = messages.length > 0;
  const isOffline = !connectivity.isOnline;
  const attachmentAnalyzed = Boolean(attachmentAnalysis?.supported);
  const botState: MedibotAnimationState = transientBotState ?? (medibotLoading || isTyping ? "thinking" : "idle");
  const healthContextStatus = healthContextEnabled ? "AI context: Today's app data" : "AI context: Off";

  useEffect(() => connectivityService.subscribe(setConnectivity), []);
  useEffect(() => () => {
    if (transientTimer.current) clearTimeout(transientTimer.current);
    if (talkTimer.current) clearTimeout(talkTimer.current);
    if (voiceLimitTimer.current) clearTimeout(voiceLimitTimer.current);
    void cancelActiveVoiceRecording();
  }, []);

  const showTransientBotState = (state: MedibotAnimationState, durationMs: number) => {
    if (transientTimer.current) clearTimeout(transientTimer.current);
    setTransientBotState(state);
    transientTimer.current = setTimeout(() => setTransientBotState(null), durationMs);
  };
  const clearVoiceLimitTimer = () => {
    if (voiceLimitTimer.current) {
      clearTimeout(voiceLimitTimer.current);
      voiceLimitTimer.current = null;
    }
  };

  const buildContextForSend = async (): Promise<HealthAIContext | undefined> => {
    if (!healthContextEnabled) return undefined;

    setHealthContextBuilding(true);
    setHealthContextMessage(null);

    try {
      const context = await buildHealthAIContext({ scope: "today" });
      setHealthContextMessage("A minimized summary of today's app data will be used for this message only.");
      return context;
    } catch {
      setHealthContextMessage("Medibot could not prepare app context, so this message was sent without it.");
      return undefined;
    } finally {
      setHealthContextBuilding(false);
    }
  };
  const sendDraftToMedibot = async (text: string) => {
    const context = await buildContextForSend();
    await sendMessage(text, { healthContext: context });
  };
  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;

    thinkingStartedAt.current = Date.now();
    showTransientBotState("thinking", 1200);
    void sendDraftToMedibot(text);
    setDraft("");
  };
  const handleToggleHealthContext = () => {
    if (healthContextEnabled) {
      setHealthContextEnabled(false);
      setHealthContextMessage("Health context is off. Medibot will not include app data with messages.");
      return;
    }

    Alert.alert(
      "Use health context",
      HEALTH_CONTEXT_USER_COPY,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Enable",
          onPress: () => {
            setHealthContextEnabled(true);
            setHealthContextMessage("Health context is on for messages you send from this session.");
          },
        },
      ],
    );
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
  const resetVoiceFlow = () => {
    clearVoiceLimitTimer();
    void cancelActiveVoiceRecording();
    setVoiceState("closed");
    setVoiceClip(null);
    setVoiceTranscript("");
    setVoiceTranscription(null);
    setVoiceMessage(null);
  };
  const handleStopVoiceRecording = async () => {
    clearVoiceLimitTimer();

    try {
      const clip = await stopVoiceRecording();
      setVoiceClip(clip);
      setVoiceState("recorded");
      setVoiceMessage("Recording stopped. Tap Transcribe to upload this short clip for transcription.");
      showTransientBotState("notification", 1200);
    } catch {
      setVoiceState("failed");
      setVoiceMessage("Healthy You could not save the recording. You can try again or keep typing.");
      showTransientBotState("notification", 1500);
    }
  };
  const handleStartVoiceRecording = async () => {
    setVoiceMessage(null);
    setVoiceTranscript("");
    setVoiceTranscription(null);

    try {
      await startVoiceRecording();
      setVoiceClip(null);
      setVoiceState("recording");
      showTransientBotState("listening", 1800);
      voiceLimitTimer.current = setTimeout(() => {
        void handleStopVoiceRecording();
      }, VOICE_RECORDING_MAX_DURATION_SECONDS * 1000);
    } catch {
      setVoiceState("failed");
      setVoiceMessage("Recording could not start. You can continue typing your message.");
      showTransientBotState("notification", 1500);
    }
  };
  const handleTranscribeVoiceClip = async () => {
    if (!voiceClip || voiceState === "transcribing") return;

    setVoiceState("transcribing");
    setVoiceMessage("Transcribing after your confirmation...");
    showTransientBotState("thinking", 1600);

    try {
      const result = await transcribeMedibotVoiceClip(voiceClip);
      setVoiceTranscription(result);
      setVoiceTranscript(result.transcript);
      setVoiceClip(null);
      setVoiceState("transcript");
      setVoiceMessage(result.fallbackUsed ? "Demo transcription returned. Review and edit before sending." : null);
      showTransientBotState("talking", 1400);
    } catch {
      const fallback: VoiceTranscriptionResult = {
        transcript: VOICE_LOCAL_FALLBACK_TRANSCRIPT,
        provider: "mock",
        fallbackUsed: true,
        safetyNotice: VOICE_TRANSCRIPT_REVIEW_NOTICE,
      };
      setVoiceTranscription(fallback);
      setVoiceTranscript(fallback.transcript);
      setVoiceClip(null);
      setVoiceState("transcript");
      setVoiceMessage("Transcription service was unavailable, so a safe editable fallback is shown.");
      showTransientBotState("notification", 1500);
    }
  };
  const handleSendVoiceTranscript = () => {
    const text = voiceTranscript.trim();
    if (!text || medibotLoading) return;

    thinkingStartedAt.current = Date.now();
    showTransientBotState("thinking", 1200);
    void sendDraftToMedibot(text);
    setVoiceState("closed");
    setVoiceClip(null);
    setVoiceTranscript("");
    setVoiceTranscription(null);
    setVoiceMessage(null);
  };
  const handleRetryVoice = () => {
    clearVoiceLimitTimer();
    void cancelActiveVoiceRecording();
    setVoiceClip(null);
    setVoiceTranscript("");
    setVoiceTranscription(null);
    setVoiceMessage(null);
    setVoiceState("ready");
  };
  const handleVoicePress = () => {
    const status = getVoiceInputFoundationStatus();
    showTransientBotState("notification", 1500);

    if (!status.available) {
      setVoiceState("unavailable");
      setVoiceClip(null);
      setVoiceTranscript("");
      setVoiceTranscription(null);
      setVoiceMessage(status.safetyNote);
      Alert.alert(status.title, `${status.message}\n\n${status.safetyNote}`);
      return;
    }

    Alert.alert(
      status.title,
      `${status.message}\n\n${status.safetyNote}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            void requestVoiceRecordingPermission().then((permission) => {
              if (!permission.granted) {
                setVoiceState("failed");
                setVoiceMessage(permission.unavailableReason ?? "Microphone permission was not granted. You can continue typing your message.");
                showTransientBotState("notification", 1500);
                return;
              }

              setVoiceState("ready");
              setVoiceMessage("Ready to record a short clip. Recording starts only after you tap Start Recording.");
              showTransientBotState("listening", 1400);
            }).catch(() => {
              setVoiceState("failed");
              setVoiceMessage("Microphone permission could not be checked. You can continue typing.");
              showTransientBotState("notification", 1500);
            });
          },
        },
      ],
    );
  };
  const handleVoiceNotify = () => {
    showTransientBotState("notification", 1500);
    Alert.alert(
      "Voice input safety",
      "Voice recording is safely paused in this RC2 build. Healthy You will not request microphone permission, record audio, upload audio, or send a transcript automatically. Medibot text chat is available now.",
    );
  };
  const canSend = draft.trim().length > 0 && !medibotLoading;
  const canSendVoiceTranscript = voiceTranscript.trim().length > 0 && !medibotLoading;

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
            <CustomCard style={styles.contextCard}>
              <View style={styles.contextHeader}>
                <View style={[styles.contextIcon, healthContextEnabled && styles.contextIconEnabled]}>
                  <Ionicons
                    color={healthContextEnabled ? COLORS.success : COLORS.primary}
                    name={healthContextEnabled ? "shield-checkmark-outline" : "shield-outline"}
                    size={18}
                  />
                </View>
                <View style={styles.contextCopy}>
                  <Text style={styles.contextTitle}>Use health context with Medibot</Text>
                  <Text style={styles.contextStatus}>
                    {healthContextBuilding ? "AI context: Preparing today's app data" : healthContextStatus}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel={healthContextEnabled ? "Turn health context off" : "Turn health context on"}
                  accessibilityRole="button"
                  activeOpacity={0.78}
                  onPress={handleToggleHealthContext}
                  style={[styles.contextToggle, healthContextEnabled && styles.contextToggleOn]}
                >
                  <Text style={[styles.contextToggleText, healthContextEnabled && styles.contextToggleTextOn]}>
                    {healthContextEnabled ? "On" : "Off"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.contextDescription}>
                {healthContextEnabled
                  ? "A bounded summary is built only when you send a message. No hidden upload or background sync is used."
                  : "Turn this on when you want Medibot to use a small summary of today's logged app data."}
              </Text>
              {healthContextMessage ? <Text style={styles.contextMessage}>{healthContextMessage}</Text> : null}
            </CustomCard>
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

          {voiceState !== "closed" ? (
            <View style={styles.voicePanel}>
              <View style={styles.voiceHeader}>
                <View style={styles.voiceIcon}>
                  <Ionicons
                    color={voiceState === "recording" ? COLORS.danger : COLORS.primary}
                    name={voiceState === "recording" ? "radio-button-on-outline" : "mic-outline"}
                    size={18}
                  />
                </View>
                <View style={styles.voiceCopy}>
                  <Text style={styles.voiceTitle}>Voice input</Text>
                  <Text style={styles.voiceStatus}>
                    {voiceState === "ready" ? "Ready to record after your tap." :
                      voiceState === "recording" ? `Recording. Maximum ${VOICE_RECORDING_MAX_DURATION_SECONDS} seconds.` :
                        voiceState === "recorded" ? "Recording stopped. Transcribe when ready." :
                          voiceState === "transcribing" ? "Transcribing after confirmation." :
                            voiceState === "transcript" ? "Transcript ready for review." :
                              voiceState === "unavailable" ? "Voice recording is paused in RC2." :
                                "Voice input fallback is active."}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Close voice input"
                  accessibilityRole="button"
                  activeOpacity={0.78}
                  onPress={resetVoiceFlow}
                  style={styles.voiceIconButton}
                >
                  <Ionicons color={COLORS.textMuted} name="close-outline" size={18} />
                </TouchableOpacity>
              </View>

              <Text style={styles.voiceSafety}>
                Healthy You does not record in the background. Audio uploads only after Transcribe, and transcript send requires your confirmation.
              </Text>
              {voiceMessage ? <Text style={styles.voiceMessage}>{voiceMessage}</Text> : null}

              {voiceState === "ready" ? (
                <View style={styles.voiceActions}>
                  <TouchableOpacity
                    accessibilityLabel="Start voice recording"
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    onPress={handleStartVoiceRecording}
                    style={styles.voicePrimaryButton}
                  >
                    <Ionicons color={COLORS.white} name="mic-outline" size={16} />
                    <Text style={styles.voicePrimaryText}>Start Recording</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Cancel voice input"
                    accessibilityRole="button"
                    activeOpacity={0.78}
                    onPress={resetVoiceFlow}
                    style={styles.voiceSecondaryButton}
                  >
                    <Text style={styles.voiceSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {voiceState === "unavailable" || voiceState === "failed" ? (
                <View style={styles.voiceActions}>
                  <TouchableOpacity
                    accessibilityLabel="Close voice fallback"
                    accessibilityRole="button"
                    activeOpacity={0.78}
                    onPress={resetVoiceFlow}
                    style={styles.voiceSecondaryButton}
                  >
                    <Text style={styles.voiceSecondaryText}>Keep Typing</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {voiceState === "recording" ? (
                <View style={styles.voiceActions}>
                  <TouchableOpacity
                    accessibilityLabel="Stop voice recording"
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    onPress={() => void handleStopVoiceRecording()}
                    style={styles.voiceDangerButton}
                  >
                    <Ionicons color={COLORS.white} name="stop-outline" size={16} />
                    <Text style={styles.voicePrimaryText}>Stop</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Cancel recording"
                    accessibilityRole="button"
                    activeOpacity={0.78}
                    onPress={resetVoiceFlow}
                    style={styles.voiceSecondaryButton}
                  >
                    <Text style={styles.voiceSecondaryText}>Cancel/Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {voiceState === "recorded" || voiceState === "transcribing" ? (
                <View style={styles.voiceActions}>
                  <TouchableOpacity
                    accessibilityLabel="Transcribe voice recording"
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={voiceState === "transcribing"}
                    onPress={() => void handleTranscribeVoiceClip()}
                    style={[styles.voicePrimaryButton, voiceState === "transcribing" && styles.voiceButtonDisabled]}
                  >
                    <Ionicons color={COLORS.white} name="text-outline" size={16} />
                    <Text style={styles.voicePrimaryText}>
                      {voiceState === "transcribing" ? "Transcribing" : "Transcribe"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Retry voice recording"
                    accessibilityRole="button"
                    activeOpacity={0.78}
                    disabled={voiceState === "transcribing"}
                    onPress={handleRetryVoice}
                    style={styles.voiceSecondaryButton}
                  >
                    <Text style={styles.voiceSecondaryText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Delete voice recording"
                    accessibilityRole="button"
                    activeOpacity={0.78}
                    disabled={voiceState === "transcribing"}
                    onPress={resetVoiceFlow}
                    style={styles.voiceSecondaryButton}
                  >
                    <Text style={styles.voiceSecondaryText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {voiceState === "transcript" ? (
                <>
                  <Text style={styles.voiceReviewLabel}>Review and edit transcript</Text>
                  <TextInput
                    accessibilityLabel="Voice transcript review"
                    multiline
                    onChangeText={setVoiceTranscript}
                    placeholder="Review transcript before sending..."
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.voiceTranscriptInput}
                    value={voiceTranscript}
                  />
                  {voiceTranscription ? (
                    <Text style={styles.voiceSafety}>
                      {voiceTranscription.safetyNotice}
                    </Text>
                  ) : null}
                  <View style={styles.voiceActions}>
                    <TouchableOpacity
                      accessibilityLabel="Send transcript to Medibot"
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={!canSendVoiceTranscript}
                      onPress={handleSendVoiceTranscript}
                      style={[styles.voicePrimaryButton, !canSendVoiceTranscript && styles.voiceButtonDisabled]}
                    >
                      <Ionicons color={COLORS.white} name="send" size={16} />
                      <Text style={styles.voicePrimaryText}>Send to Medibot</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel="Retry voice recording"
                      accessibilityRole="button"
                      activeOpacity={0.78}
                      onPress={handleRetryVoice}
                      style={styles.voiceSecondaryButton}
                    >
                      <Text style={styles.voiceSecondaryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
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
  contextCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  contextHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  contextIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.md,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  contextIconEnabled: {
    backgroundColor: COLORS.accentLight,
  },
  contextCopy: {
    flex: 1,
    minWidth: 0,
  },
  contextTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  contextStatus: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  contextDescription: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 17,
  },
  contextMessage: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: 17,
  },
  contextToggle: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.md,
    minHeight: 34,
    minWidth: 48,
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
  },
  contextToggleOn: {
    backgroundColor: COLORS.accentLight,
  },
  contextToggleText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  contextToggleTextOn: {
    color: COLORS.success,
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
  voicePanel: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    padding: SPACING.md,
  },
  voiceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  voiceIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.md,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  voiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  voiceTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  voiceStatus: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  voiceIconButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.md,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  voiceSafety: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 17,
  },
  voiceMessage: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: 17,
  },
  voiceActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  voicePrimaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.md,
    flexDirection: "row",
    gap: SPACING.xs,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: SPACING.md,
  },
  voiceDangerButton: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: SPACING.md,
    flexDirection: "row",
    gap: SPACING.xs,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: SPACING.md,
  },
  voiceButtonDisabled: {
    opacity: 0.55,
  },
  voicePrimaryText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  voiceSecondaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.md,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: SPACING.md,
  },
  voiceSecondaryText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  voiceReviewLabel: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  voiceTranscriptInput: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    borderRadius: SPACING.md,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 19,
    minHeight: 88,
    padding: SPACING.sm,
    textAlignVertical: "top",
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
