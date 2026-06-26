import {
  describe,
  expect,
  it,
} from "vitest";

import { SUPERVISOR_QUESTIONS } from "./supervisorQuestions";
import {
  calculateRoundedAverage,
  getPresentationScenario,
  PRESENTATION_DATA_NOTICE,
  PRESENTATION_DATASET_ID,
  PRESENTATION_SCENARIOS,
  PRESENTATION_SERIES,
} from "./presentationAnalysis";

describe("presentationAnalysis", () => {
  it("uses an explicit presentation-only dataset identity", () => {
    expect(PRESENTATION_DATASET_ID).toBe(
      "supervisor-presentation-v1",
    );

    expect(PRESENTATION_DATA_NOTICE).toMatch(
      /not live research results/i,
    );
  });

  it("defines unique comparison series with bounded metrics", () => {
    const ids = PRESENTATION_SERIES.map((series) => series.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(PRESENTATION_SERIES).toHaveLength(4);

    for (const series of PRESENTATION_SERIES) {
      for (const metric of [
        series.alignment,
        series.confidence,
        series.consistency,
      ]) {
        expect(metric).toBeGreaterThanOrEqual(0);
        expect(metric).toBeLessThanOrEqual(100);
      }
    }
  });

  it("covers every supervisor question with bounded chart values", () => {
    expect(PRESENTATION_SCENARIOS).toHaveLength(
      SUPERVISOR_QUESTIONS.length,
    );

    for (const question of SUPERVISOR_QUESTIONS) {
      const scenario = getPresentationScenario(question.id);

      expect(scenario?.title).toBe(question.title);
      expect(
        question.options.some(
          (option) => option.id === scenario?.consensusOptionId,
        ),
      ).toBe(true);

      for (const value of Object.values(scenario?.alignment ?? {})) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("calculates rounded averages safely", () => {
    expect(calculateRoundedAverage([])).toBe(0);
    expect(calculateRoundedAverage([60, 70, 80])).toBe(70);
    expect(calculateRoundedAverage([61, 62])).toBe(62);
  });

  it("returns undefined for an unknown scenario", () => {
    expect(
      getPresentationScenario("missing-scenario"),
    ).toBeUndefined();
  });
});
