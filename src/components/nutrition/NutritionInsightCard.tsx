import React from "react";
import InsightCard from "../layout/InsightCard";
import type { NutritionInsight } from "../../types";

type NutritionInsightCardProps = {
  insight: NutritionInsight;
};

export default function NutritionInsightCard({ insight }: NutritionInsightCardProps) {
  return (
    <InsightCard
      detail={insight.detail}
      iconName={insight.iconName}
      status={insight.status}
      title={insight.title}
      tone={insight.tone}
    />
  );
}
