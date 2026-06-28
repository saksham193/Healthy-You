import type { MedicalKnowledgeDocument } from "../MedicalKnowledgeTypes";

type CuratedSeedDocument = Omit<
  MedicalKnowledgeDocument,
  "version" | "reviewedBy" | "expiresAt" | "reviewStatus" | "qualityScore" | "isDeprecated"
> & Partial<Pick<
  MedicalKnowledgeDocument,
  "version" | "reviewedBy" | "expiresAt" | "reviewStatus" | "qualityScore" | "isDeprecated"
>>;

const govern = (document: CuratedSeedDocument): MedicalKnowledgeDocument => ({
  version: "1.0.0",
  reviewedBy: "Healthy You Medical Knowledge Governance",
  expiresAt: "2027-06-23",
  reviewStatus: "approved",
  qualityScore: document.source.sourceName === "American Heart Association" ? 82 : 90,
  isDeprecated: false,
  ...document,
});

const curatedSeedDocuments: CuratedSeedDocument[] = [
  {
    id: "hydration-basics",
    title: "Hydration basics",
    category: "hydration",
    source: { sourceName: "MedlinePlus", sourceType: "government" },
    reviewedAt: "2026-06-23",
    safetyLevel: "wellness",
    tags: ["water", "hydration", "dehydration", "fluids"],
    chunks: [
      {
        id: "hydration-basics-1",
        content: "Hydration needs vary by person, activity, climate, and health conditions. A practical wellness step is to drink fluids steadily through the day and pay attention to thirst, urine color, exercise, heat, and clinician-provided fluid limits.",
      },
    ],
  },
  {
    id: "sleep-hygiene-basics",
    title: "Sleep hygiene basics",
    category: "sleep",
    source: { sourceName: "CDC", sourceType: "government" },
    reviewedAt: "2026-06-23",
    safetyLevel: "wellness",
    tags: ["sleep", "bedtime", "insomnia", "fatigue", "routine"],
    chunks: [
      {
        id: "sleep-hygiene-basics-1",
        content: "Consistent sleep and wake times, a calming wind-down, lower evening stimulation, and a comfortable sleep environment can support better sleep. Persistent sleep problems or severe daytime sleepiness should be discussed with a qualified professional.",
      },
    ],
  },
  {
    id: "balanced-plate-nutrition",
    title: "Balanced plate nutrition",
    category: "nutrition",
    source: { sourceName: "WHO", sourceType: "public_health" },
    reviewedAt: "2026-06-23",
    safetyLevel: "wellness",
    tags: ["nutrition", "meal", "protein", "vegetables", "calories", "diet"],
    chunks: [
      {
        id: "balanced-plate-nutrition-1",
        content: "A balanced meal pattern usually includes vegetables or fruit, a protein source, fiber-rich carbohydrates, and healthy fats. Food choices should account for allergies, preferences, cultural patterns, and clinician guidance for specific conditions.",
      },
    ],
  },
  {
    id: "safe-exercise-basics",
    title: "Safe exercise basics",
    category: "exercise",
    source: { sourceName: "American Heart Association", sourceType: "professional_association" },
    reviewedAt: "2026-06-23",
    safetyLevel: "caution",
    tags: ["exercise", "workout", "heart rate", "activity", "recovery", "steps"],
    chunks: [
      {
        id: "safe-exercise-basics-1",
        content: "Activity is safest when increased gradually and balanced with recovery. Stop exercise and seek urgent help if activity is accompanied by chest pain, fainting, severe breathlessness, or stroke-like symptoms.",
      },
    ],
  },
  {
    id: "medication-adherence-reminders",
    title: "Medication adherence reminders",
    category: "medication_adherence",
    source: { sourceName: "NHS", sourceType: "public_health" },
    reviewedAt: "2026-06-23",
    safetyLevel: "caution",
    tags: ["medication", "medicine", "pill", "missed dose", "adherence", "reminder"],
    chunks: [
      {
        id: "medication-adherence-reminders-1",
        content: "Medication reminder tools, routines, and pharmacy support can help adherence. Do not change doses, stop a prescribed medication, or combine medications based on general app guidance; ask a doctor or pharmacist for medication-specific advice.",
      },
    ],
  },
  {
    id: "emergency-red-flags",
    title: "Emergency red flags",
    category: "emergency_symptoms",
    source: { sourceName: "CDC", sourceType: "government" },
    reviewedAt: "2026-06-23",
    safetyLevel: "urgent",
    tags: ["chest pain", "breathing", "stroke", "fainting", "allergic reaction", "suicide", "emergency"],
    chunks: [
      {
        id: "emergency-red-flags-1",
        content: "Symptoms such as chest pain, severe trouble breathing, fainting, stroke-like symptoms, severe allergic reaction, or suicidal intent can be urgent. A health app should advise immediate local emergency care rather than trying to assess or diagnose.",
      },
    ],
  },
  {
    id: "wearable-data-limitations",
    title: "Wearable data limitations",
    category: "device_health_data",
    source: { sourceName: "American Heart Association", sourceType: "professional_association" },
    reviewedAt: "2026-06-23",
    safetyLevel: "wellness",
    tags: ["wearable", "watch", "device", "heart rate", "steps", "sync", "sensor"],
    chunks: [
      {
        id: "wearable-data-limitations-1",
        content: "Wearable and phone health data can support trends, but readings may be incomplete, delayed, or affected by sensor fit and permissions. Concerning symptoms should be judged by clinical care, not wearable data alone.",
      },
    ],
  },
  {
    id: "professional-care-guidance",
    title: "When to seek professional care",
    category: "preventive_health",
    source: { sourceName: "MedlinePlus", sourceType: "government" },
    reviewedAt: "2026-06-23",
    safetyLevel: "caution",
    tags: ["clinician", "doctor", "professional", "symptoms", "care", "prevention"],
    chunks: [
      {
        id: "professional-care-guidance-1",
        content: "General wellness education cannot diagnose symptoms. New, worsening, persistent, or concerning symptoms should be reviewed with a qualified health professional, and urgent symptoms should be handled through local emergency services.",
      },
    ],
  },
  {
    id: "chronic-condition-general",
    title: "General chronic condition support",
    category: "chronic_condition_general",
    source: { sourceName: "WHO", sourceType: "public_health" },
    reviewedAt: "2026-06-23",
    safetyLevel: "caution",
    tags: ["diabetes", "hypertension", "asthma", "chronic", "condition", "monitoring"],
    chunks: [
      {
        id: "chronic-condition-general-1",
        content: "People with chronic conditions often benefit from consistent monitoring, medication adherence, healthy routines, and regular clinician follow-up. App guidance should stay educational and defer condition-specific decisions to qualified professionals.",
      },
    ],
  },
  {
    id: "general-wellness-foundation",
    title: "General wellness foundation",
    category: "general_wellness",
    source: { sourceName: "WHO", sourceType: "public_health" },
    reviewedAt: "2026-06-23",
    safetyLevel: "wellness",
    tags: ["wellness", "routine", "prevention", "healthy habits", "summary"],
    chunks: [
      {
        id: "general-wellness-foundation-1",
        content: "Wellness guidance is most useful when it focuses on small sustainable habits: sleep, hydration, balanced meals, activity, medication routines when prescribed, and timely professional care for symptoms.",
      },
    ],
  },
];

export const curatedHealthKnowledge: MedicalKnowledgeDocument[] = curatedSeedDocuments.map(govern);
