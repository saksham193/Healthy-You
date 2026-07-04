import React from "react";
import { StyleSheet, Text, View } from "react-native";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { ConversationMessage } from "../../types";

type ConversationBubbleProps = {
  message: ConversationMessage;
};

export default function ConversationBubble({ message }: ConversationBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{message.message}</Text>
      </View>
    );
  }

  return (
    <CustomCard style={styles.assistantBubble}>
      {message.metadata?.offline ? (
        <Text style={styles.metaText}>
          {[
            message.metadata.fallback ? "Offline fallback" : "Offline response",
            message.metadata.cachedResponseUsed ? "cached" : "",
          ].filter(Boolean).join(" - ")}
        </Text>
      ) : null}
      <Text style={styles.assistantText}>{message.message}</Text>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: SPACING.sm,
    borderRadius: SPACING.xl,
    maxWidth: "88%",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: SPACING.sm,
    maxWidth: "92%",
    padding: SPACING.lg,
  },
  userText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  assistantText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.xs,
  },
});
