import React from "react";
import ActionCard from "../layout/ActionCard";
import type { NutritionAction } from "../../types";

type NutritionActionCardProps = {
  action: NutritionAction;
  onPress?: () => void;
};

export default function NutritionActionCard({ action, onPress }: NutritionActionCardProps) {
  return (
    <ActionCard
      iconName={action.iconName}
      onPress={onPress}
      title={action.title}
      tone={action.tone}
    />
  );
}
