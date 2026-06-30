import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export default function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <CustomCard style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons color={COLORS.primary} name="key-outline" size={28} />
          </View>
          <Text style={styles.title}>Password reset</Text>
          <Text style={styles.subtitle}>
            Password reset emails are coming soon. For now, return to sign in or create a new test account.
          </Text>
          <Pressable accessibilityRole="button" onPress={onBackToLogin} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to Sign In</Text>
          </Pressable>
        </CustomCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.screen,
  },
  card: {
    alignItems: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    marginBottom: SPACING.md,
    width: 56,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.lineHeights.md,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: "center",
    marginTop: SPACING.xl,
    minHeight: 50,
    paddingHorizontal: SPACING.xl,
    width: "100%",
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
