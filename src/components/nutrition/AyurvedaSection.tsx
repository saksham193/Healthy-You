import React, { useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import DashboardSection from "../layout/DashboardSection";
import { COLORS, NUTRITION_COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { IconName } from "../../types";

type Dosha = {
  id: "vata" | "pitta" | "kapha";
  name: string;
  iconName: IconName;
  summary: string;
};

const doshas: Dosha[] = [
  {
    id: "vata",
    name: "Vata",
    iconName: "leaf-outline",
    summary: "Favor warm meals, steady hydration, and grounding foods like soups, oats, and cooked vegetables.",
  },
  {
    id: "pitta",
    name: "Pitta",
    iconName: "sunny-outline",
    summary: "Choose cooling meals, leafy greens, cucumber, mint, and balanced spices to support calm digestion.",
  },
  {
    id: "kapha",
    name: "Kapha",
    iconName: "flame-outline",
    summary: "Lean into lighter meals, warming spices, legumes, and energizing routines through the day.",
  },
];

const DOSHA_VISUALS = {
  vata: {
    accent: "#6EAFC0",
    background: "#EEF9FC",
    figure: require("../../../assets/ayurveda/dosha-vata-figure.png") as ImageSourcePropType,
    figureWidth: 36,
    label: "VATA",
    symbol: "sync-outline",
  },
  pitta: {
    accent: "#E8632C",
    background: "#FFF2E8",
    figure: require("../../../assets/ayurveda/dosha-pitta-figure.png") as ImageSourcePropType,
    figureWidth: 38,
    label: "PITTA",
    symbol: "flame-outline",
  },
  kapha: {
    accent: "#4F8A20",
    background: "#F1FAEA",
    figure: require("../../../assets/ayurveda/dosha-kapha-figure.png") as ImageSourcePropType,
    figureWidth: 44,
    label: "KAPHA",
    symbol: "leaf-outline",
  },
} satisfies Record<Dosha["id"], {
  accent: string;
  background: string;
  figure: ImageSourcePropType;
  figureWidth: number;
  label: string;
  symbol: IconName;
}>;

export default function AyurvedaSection() {
  const [selectedDosha, setSelectedDosha] = useState<Dosha["id"]>("pitta");
  const selected = useMemo(
    () => doshas.find((dosha) => dosha.id === selectedDosha) ?? doshas[0],
    [selectedDosha],
  );

  return (
    <View>
      <DashboardSection title="Ayurveda" />
      <View style={styles.doshaRow}>
        {doshas.map((dosha) => {
          const active = dosha.id === selectedDosha;
          const visual = DOSHA_VISUALS[dosha.id];

          return (
            <TouchableOpacity
              accessibilityLabel={`${dosha.name} dosha body type`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              activeOpacity={0.82}
              key={dosha.id}
              onPress={() => setSelectedDosha(dosha.id)}
              style={[
                styles.doshaCard,
                active && [
                  styles.doshaCardActive,
                  {
                    backgroundColor: visual.background,
                    borderColor: visual.accent,
                  },
                ],
                active && styles.doshaCardSelectedLift,
              ]}
            >
              <View
                style={[
                  styles.doshaSymbolRing,
                  {
                    backgroundColor: active ? COLORS.white : visual.background,
                    borderColor: visual.accent,
                  },
                ]}
              >
                <Ionicons color={visual.accent} name={visual.symbol} size={31} />
              </View>
              <Text style={[styles.doshaName, { color: visual.accent }]}>{visual.label}</Text>
              <View style={styles.figureSlot} pointerEvents="none">
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="contain"
                  source={visual.figure}
                  style={[styles.figureImage, { width: visual.figureWidth }]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <CustomCard style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons color={NUTRITION_COLORS.secondary} name={selected.iconName} size={24} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>{selected.name} (Your Type)</Text>
          <Text style={styles.summaryText}>{selected.summary}</Text>
        </View>
        <Ionicons color={COLORS.textMuted} name="chevron-forward" size={20} />
      </CustomCard>
    </View>
  );
}

const styles = StyleSheet.create({
  doshaRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  doshaCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    justifyContent: "space-between",
    minHeight: 166,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    ...SHADOWS.soft,
  },
  doshaCardActive: {
    borderWidth: 2,
  },
  doshaCardSelectedLift: {
    transform: [{ scale: 1.015 }],
    ...SHADOWS.medium,
  },
  doshaSymbolRing: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 2,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  doshaName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
    letterSpacing: 0,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  figureSlot: {
    alignItems: "center",
    height: 72,
    justifyContent: "flex-end",
    marginTop: SPACING.xs,
    width: "100%",
  },
  figureImage: {
    height: 72,
  },
  summaryCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: NUTRITION_COLORS.light,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  summaryText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
});
