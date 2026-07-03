import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomCard from "../common/CustomCard";
import DashboardSection from "../layout/DashboardSection";
import { COLORS, NUTRITION_COLORS } from "../../theme/colors";
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

          return (
            <TouchableOpacity
              activeOpacity={0.82}
              key={dosha.id}
              onPress={() => setSelectedDosha(dosha.id)}
              style={[styles.doshaCard, active && styles.doshaCardActive]}
            >
              <View style={[styles.doshaIcon, active && styles.doshaIconActive]}>
                <Ionicons color={active ? COLORS.white : NUTRITION_COLORS.secondary} name={dosha.iconName} size={30} />
              </View>
              <Text style={[styles.doshaName, active && styles.doshaNameActive]}>{dosha.name}</Text>
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
    gap: SPACING.md,
  },
  doshaCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 118,
    padding: SPACING.md,
  },
  doshaCardActive: {
    backgroundColor: NUTRITION_COLORS.light,
    borderColor: NUTRITION_COLORS.secondary,
  },
  doshaIcon: {
    alignItems: "center",
    backgroundColor: NUTRITION_COLORS.light,
    borderRadius: 24,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  doshaIconActive: {
    backgroundColor: NUTRITION_COLORS.secondary,
  },
  doshaName: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.sm,
  },
  doshaNameActive: {
    color: NUTRITION_COLORS.dark,
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
