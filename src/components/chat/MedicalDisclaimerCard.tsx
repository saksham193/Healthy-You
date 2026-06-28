import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

export default function MedicalDisclaimerCard() {
  return (
    <CustomCard style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons color={COLORS.warning} name="warning-outline" size={22} />
      </View>
      <Text style={styles.text}>
        Medibot provides educational wellness information and does not replace professional medical advice.
      </Text>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warningLight,
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl + SPACING.sm,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.sm,
  },
  text: {
    color: COLORS.text,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
  },
});
