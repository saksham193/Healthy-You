import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import { useAuthStore } from "../../store/authStore";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type LoginScreenProps = {
  onForgotPassword: () => void;
  onRegister: () => void;
};

export default function LoginScreen({ onForgotPassword, onRegister }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const clearError = useAuthStore((state) => state.clearError);
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);

  const handleLogin = () => {
    void login(email.trim(), password);
  };

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleForgotPassword = () => {
    clearError();
    onForgotPassword();
  };

  const handleRegister = () => {
    clearError();
    onRegister();
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Ionicons color={COLORS.white} name="heart" size={24} />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your health dashboard</Text>
        </View>

        <CustomCard style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            editable={!isLoading}
            inputMode="email"
            onChangeText={(value) => {
              clearError();
              setEmail(value);
            }}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            autoComplete="password"
            editable={!isLoading}
            onChangeText={(value) => {
              clearError();
              setPassword(value);
            }}
            placeholder="Your password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isLoading || !email.trim() || !password}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isLoading) && styles.buttonPressed,
              (!email.trim() || !password) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>{isLoading ? "Signing in..." : "Sign In"}</Text>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={handleForgotPassword} style={styles.textButton}>
            <Text style={styles.textButtonText}>Forgot password?</Text>
          </Pressable>
        </CustomCard>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>New to Healthy You?</Text>
          <Pressable accessibilityRole="button" onPress={handleRegister}>
            <Text style={styles.switchAction}>Create account</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.screen,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    height: 52,
    justifyContent: "center",
    marginBottom: SPACING.md,
    width: 52,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.lineHeights.md,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  card: {
    gap: SPACING.sm,
  },
  label: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  error: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginBottom: SPACING.sm,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: SPACING.lg,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  textButton: {
    alignItems: "center",
    paddingTop: SPACING.md,
  },
  textButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    justifyContent: "center",
    marginTop: SPACING.lg,
  },
  switchText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  switchAction: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
