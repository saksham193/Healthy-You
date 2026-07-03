import React from "react";
import { StyleSheet, Text, View } from "react-native";
import CustomCard from "../common/CustomCard";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type ActivityChartProps = {
  title?: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  mode?: "line" | "dot";
  accentColor?: string;
  trackColor?: string;
};

export default function ActivityChart({
  title,
  subtitle,
  labels,
  values,
  mode = "line",
  accentColor = COLORS.primary,
  trackColor = COLORS.primaryLight,
}: ActivityChartProps) {
  const max = Math.max(...values, 1);

  return (
    <CustomCard style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.chart}>
        {values.map((value, index) => {
          const height = Math.max(12, (value / max) * 94);
          return (
            <View key={`${labels[index]}-${index}`} style={styles.column}>
              <View style={styles.plotArea}>
                {mode === "line" ? <View style={[styles.line, { backgroundColor: trackColor, height }]} /> : null}
                <View
                  style={[
                    styles.dot,
                    { borderColor: accentColor },
                    mode === "dot" && {
                      bottom: height,
                    },
                  ]}
                />
              </View>
              <Text style={styles.label}>{labels[index]}</Text>
            </View>
          );
        })}
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: SPACING.sm,
  },
  title: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  subtitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    marginTop: SPACING.xs / 2,
  },
  chart: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 126,
    marginTop: SPACING.lg,
  },
  column: {
    alignItems: "center",
    flex: 1,
  },
  plotArea: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    position: "relative",
    width: "100%",
  },
  line: {
    borderRadius: 999,
    width: 3,
  },
  dot: {
    backgroundColor: COLORS.white,
    borderRadius: 7,
    borderWidth: 3,
    height: 14,
    position: "absolute",
    width: 14,
  },
  label: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.sm,
  },
});
