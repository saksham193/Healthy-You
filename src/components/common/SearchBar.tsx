import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

type SearchBarProps = {
  placeholder?: string;
};

export default function SearchBar({ placeholder = "Search health tools..." }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons color={COLORS.textMuted} name="search-outline" size={20} style={styles.icon} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        returnKeyType="search"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
  },
  icon: {
    marginRight: SPACING.md,
  },
  input: {
    color: COLORS.text,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    minHeight: 52,
  },
});
