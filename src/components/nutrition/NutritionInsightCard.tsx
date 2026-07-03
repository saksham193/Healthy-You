import React from "react";
import InsightCard from "../layout/InsightCard";
import {
  getNutritionInsightStatusToneColors,
  getNutritionInsightToneColors,
} from "../../utils/tone";
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
      statusToneColorsOverride={getNutritionInsightStatusToneColors(insight.status)}
      title={insight.title}
      tone={insight.tone}
      toneColorsOverride={getNutritionInsightToneColors(insight.id, insight.title, insight.tone)}
    />
  );
}
