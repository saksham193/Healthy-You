export type MedicalSourceTier = "tier_1" | "tier_2" | "tier_3" | "unsupported";
export type MedicalSourceReviewStatus = "draft" | "reviewed" | "approved" | "deprecated";
export type MedicalSourceRiskLevel = "low" | "medium" | "high";

export type MedicalSource = {
  id: string;
  name: string;
  organization: string;
  tier: MedicalSourceTier;
  reviewStatus: MedicalSourceReviewStatus;
  approvedForProduction: boolean;
  lastReviewed: string;
  reviewFrequencyDays: number;
  riskLevel: MedicalSourceRiskLevel;
};

export const medicalSources: MedicalSource[] = [
  {
    id: "who",
    name: "WHO",
    organization: "World Health Organization",
    tier: "tier_1",
    reviewStatus: "approved",
    approvedForProduction: true,
    lastReviewed: "2026-06-23",
    reviewFrequencyDays: 365,
    riskLevel: "low",
  },
  {
    id: "cdc",
    name: "CDC",
    organization: "Centers for Disease Control and Prevention",
    tier: "tier_1",
    reviewStatus: "approved",
    approvedForProduction: true,
    lastReviewed: "2026-06-23",
    reviewFrequencyDays: 365,
    riskLevel: "low",
  },
  {
    id: "nhs",
    name: "NHS",
    organization: "National Health Service",
    tier: "tier_1",
    reviewStatus: "approved",
    approvedForProduction: true,
    lastReviewed: "2026-06-23",
    reviewFrequencyDays: 365,
    riskLevel: "low",
  },
  {
    id: "medlineplus",
    name: "MedlinePlus",
    organization: "U.S. National Library of Medicine",
    tier: "tier_1",
    reviewStatus: "approved",
    approvedForProduction: true,
    lastReviewed: "2026-06-23",
    reviewFrequencyDays: 365,
    riskLevel: "low",
  },
  {
    id: "aha",
    name: "American Heart Association",
    organization: "American Heart Association",
    tier: "tier_2",
    reviewStatus: "approved",
    approvedForProduction: true,
    lastReviewed: "2026-06-23",
    reviewFrequencyDays: 365,
    riskLevel: "medium",
  },
  {
    id: "healthy-you-internal",
    name: "Healthy You Internal",
    organization: "Healthy You",
    tier: "tier_3",
    reviewStatus: "draft",
    approvedForProduction: false,
    lastReviewed: "2026-06-23",
    reviewFrequencyDays: 180,
    riskLevel: "medium",
  },
];

export const getSourceGovernance = (sourceName: string): MedicalSource => {
  const normalized = sourceName.toLowerCase();
  const source = medicalSources.find((item) => item.name.toLowerCase() === normalized);

  return source ?? {
    id: `unsupported-${normalized.replace(/[^a-z0-9]+/g, "-")}`,
    name: sourceName,
    organization: "Unknown",
    tier: "unsupported",
    reviewStatus: "draft",
    approvedForProduction: false,
    lastReviewed: "1970-01-01",
    reviewFrequencyDays: 0,
    riskLevel: "high",
  };
};
