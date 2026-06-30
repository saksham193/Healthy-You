import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../../components/common/ScreenContainer";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

export default function AuthLoadingScreen() {
  return (
    <ScreenContainer scroll={false}>
      <View style={styles.container}>
        <View style={styles.brandMark}>
          <Ionicons color={COLORS.white} name="heart" size={26} />
        </View>
        <Text style={styles.title}>Healthy You</Text>
        <Text style={styles.subtitle}>Restoring your session</Text>
        <ActivityIndicator color={COLORS.primary} size="large" style={styles.spinner} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: SPACING.xxl,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    height: 56,
    justifyContent: "center",
    marginBottom: SPACING.lg,
    width: 56,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.md,
    marginTop: SPACING.xs,
  },
  spinner: {
    marginTop: SPACING.xxl,
  },
});
