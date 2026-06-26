export type ComparisonSeriesId =
  | "human"
  | "reasoning-model"
  | "general-model"
  | "lightweight-model";

export interface PresentationComparisonSeries {
  id: ComparisonSeriesId;
  label: string;
  category: string;
  alignment: number;
  confidence: number;
  consistency: number;
  summary: string;
}

export interface PresentationScenarioComparison {
  questionId: string;
  title: string;
  category: string;
  consensusOptionId: string;
  insight: string;
  alignment: Record<ComparisonSeriesId, number>;
}

export const PRESENTATION_DATA_NOTICE =
  "Illustrative presentation dataset. These values are not live research results.";

export const PRESENTATION_DATASET_ID =
  "supervisor-presentation-v1";

export const PRESENTATION_SERIES: readonly PresentationComparisonSeries[] = [
  {
    id: "human",
    label: "Human benchmark",
    category: "Illustrative participant aggregate",
    alignment: 63,
    confidence: 64,
    consistency: 72,
    summary:
      "A sample human baseline showing moderate alignment and variable confidence.",
  },
  {
    id: "reasoning-model",
    label: "Reasoning model",
    category: "Illustrative analytical model",
    alignment: 84,
    confidence: 78,
    consistency: 88,
    summary:
      "A presentation profile emphasizing deliberate, probability-aware reasoning.",
  },
  {
    id: "general-model",
    label: "General model",
    category: "Illustrative general-purpose model",
    alignment: 77,
    confidence: 74,
    consistency: 80,
    summary:
      "A balanced presentation profile with strong but not uniform alignment.",
  },
  {
    id: "lightweight-model",
    label: "Lightweight model",
    category: "Illustrative compact model",
    alignment: 63,
    confidence: 69,
    consistency: 65,
    summary:
      "A lower-cost presentation profile with more variation across scenarios.",
  },
];

export const PRESENTATION_SCENARIOS: readonly PresentationScenarioComparison[] = [
  {
    questionId: "conjunction-probability",
    title: "Conjunction Fallacy",
    category: "Probability estimation",
    consensusOptionId: "bank-teller",
    insight:
      "The analytical profile shows the strongest resistance to the conjunction error.",
    alignment: {
      human: 54,
      "reasoning-model": 88,
      "general-model": 79,
      "lightweight-model": 63,
    },
  },
  {
    questionId: "framing-program",
    title: "Framing Effect",
    category: "Contextual bias",
    consensusOptionId: "certain-save",
    insight:
      "All profiles remain somewhat sensitive to framing, with the largest gap in the human benchmark.",
    alignment: {
      human: 62,
      "reasoning-model": 81,
      "general-model": 74,
      "lightweight-model": 59,
    },
  },
  {
    questionId: "risk-reward",
    title: "Risk Preference",
    category: "Expected value",
    consensusOptionId: "variable-reward",
    insight:
      "The analytical profile most often selects the higher expected-value option.",
    alignment: {
      human: 73,
      "reasoning-model": 83,
      "general-model": 78,
      "lightweight-model": 67,
    },
  },
];

export function calculateRoundedAverage(
  values: readonly number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0,
  );

  return Math.round(total / values.length);
}

export function getPresentationScenario(
  questionId: string,
): PresentationScenarioComparison | undefined {
  return PRESENTATION_SCENARIOS.find(
    (scenario) => scenario.questionId === questionId,
  );
}
