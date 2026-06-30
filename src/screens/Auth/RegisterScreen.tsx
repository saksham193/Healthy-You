import React, { useState } from "react";
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

type RegisterScreenProps = {
  onLogin: () => void;
};

export default function RegisterScreen({ onLogin }: RegisterScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const clearError = useAuthStore((state) => state.clearError);
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const register = useAuthStore((state) => state.register);
  const canSubmit = Boolean(name.trim() && email.trim() && password.length >= 8);

  const handleRegister = () => {
    void register(name.trim(), email.trim(), password);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Ionicons color={COLORS.white} name="person-add" size={24} />
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start with a secure Healthy You profile</Text>
        </View>

        <CustomCard style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            editable={!isLoading}
            onChangeText={(value) => {
              clearError();
              setName(value);
            }}
            placeholder="Test User"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={name}
          />

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
            autoComplete="new-password"
            editable={!isLoading}
            onChangeText={(value) => {
              clearError();
              setPassword(value);
            }}
            placeholder="At least 8 characters"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isLoading || !canSubmit}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isLoading) && styles.buttonPressed,
              !canSubmit && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>{isLoading ? "Creating..." : "Create Account"}</Text>
          </Pressable>
        </CustomCard>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account?</Text>
          <Pressable accessibilityRole="button" onPress={onLogin}>
            <Text style={styles.switchAction}>Sign in</Text>
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
