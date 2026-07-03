import React, { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../common/SearchBar";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: ReactNode;
  children?: ReactNode;
  theme?: {
    backgroundColor?: string;
    glowColor?: string;
    glowAccentColor?: string;
    subtitleColor?: string;
    foregroundColor?: string;
    actionBackgroundColor?: string;
  };
};

export default function AppHeader({
  title,
  subtitle,
  showSearch = false,
  showBackButton = false,
  onBackPress,
  rightAction,
  children,
  theme,
}: AppHeaderProps) {
  const leftIcon: IconName = showBackButton ? "chevron-back" : "heart";
  const foregroundColor = theme?.foregroundColor ?? COLORS.white;
  const actionBackgroundColor = theme?.actionBackgroundColor ?? COLORS.overlaySoft;

  return (
    <View style={[styles.header, theme?.backgroundColor ? { backgroundColor: theme.backgroundColor } : null]}>
      <View style={[styles.glowOne, theme?.glowColor ? { backgroundColor: theme.glowColor } : null]} />
      <View style={[styles.glowTwo, theme?.glowAccentColor ? { backgroundColor: theme.glowAccentColor } : null]} />

      <View style={styles.statusRow}>
        <Text style={[styles.time, { color: foregroundColor }]}>9:41</Text>
        <View style={styles.statusIcons}>
          <Ionicons color={foregroundColor} name="cellular" size={15} />
          <Ionicons color={foregroundColor} name="wifi" size={15} />
          <Ionicons color={foregroundColor} name="battery-full" size={18} />
        </View>
      </View>

      <View style={styles.titleRow}>
        {showBackButton ? (
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            activeOpacity={0.72}
            onPress={onBackPress}
            style={[styles.headerAction, { backgroundColor: actionBackgroundColor }]}
          >
            <Ionicons color={foregroundColor} name={leftIcon} size={18} />
          </TouchableOpacity>
        ) : (
          <View
            accessibilityLabel="Healthy You"
            style={[styles.headerAction, { backgroundColor: actionBackgroundColor }]}
          >
            <Ionicons color={foregroundColor} name={leftIcon} size={18} />
          </View>
        )}

        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={[styles.title, { color: foregroundColor }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[styles.subtitle, theme?.subtitleColor ? { color: theme.subtitleColor } : null]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={[styles.headerAction, { backgroundColor: actionBackgroundColor }]}>
          {rightAction ?? <View style={styles.placeholder} />}
        </View>
      </View>

      {showSearch ? (
        <View style={styles.searchWrap}>
          <SearchBar placeholder="Search" />
        </View>
      ) : null}

      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primaryDark,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  glowOne: {
    backgroundColor: COLORS.secondary,
    borderRadius: 120,
    height: 160,
    opacity: 0.45,
    position: "absolute",
    right: -44,
    top: -52,
    width: 160,
  },
  glowTwo: {
    backgroundColor: COLORS.purpleInk,
    borderRadius: 90,
    bottom: -42,
    height: 120,
    left: -40,
    opacity: 0.32,
    position: "absolute",
    width: 120,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  statusIcons: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.xs,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  headerAction: {
    alignItems: "center",
    backgroundColor: COLORS.overlaySoft,
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  placeholder: {
    height: 18,
    width: 18,
  },
  titleBlock: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  title: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.primaryLight,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  searchWrap: {
    marginTop: SPACING.xl,
  },
  content: {
    marginTop: SPACING.lg,
  },
});
