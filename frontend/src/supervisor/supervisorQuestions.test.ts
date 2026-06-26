import {
  describe,
  expect,
  it,
} from "vitest";

import { SUPERVISOR_QUESTIONS } from "./supervisorQuestions";

describe("SUPERVISOR_QUESTIONS", () => {
  it("provides the three intended decision scenarios", () => {
    expect(
      SUPERVISOR_QUESTIONS.map((question) => question.title),
    ).toEqual([
      "Conjunction Fallacy",
      "Framing Effect",
      "Risk Preference",
    ]);
  });

  it("uses unique question and option identifiers", () => {
    const questionIds = SUPERVISOR_QUESTIONS.map(
      (question) => question.id,
    );

    const optionIds = SUPERVISOR_QUESTIONS.flatMap(
      (question) => question.options.map((option) => option.id),
    );

    expect(new Set(questionIds).size).toBe(questionIds.length);
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });

  it("gives every question usable presentation content", () => {
    for (const question of SUPERVISOR_QUESTIONS) {
      expect(question.category.trim()).not.toBe("");
      expect(question.context.trim()).not.toBe("");
      expect(question.prompt.trim()).not.toBe("");
      expect(question.options.length).toBeGreaterThanOrEqual(2);

      for (const option of question.options) {
        expect(option.label.trim()).not.toBe("");
      }
    }
  });
});
