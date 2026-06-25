import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isStudyPhase,
  STUDY_PHASES,
  type StudyPhase,
} from "./studyState";

describe("studyState", () => {
  it(
    "exports every supported study phase in workflow order",
    () => {
      expect(STUDY_PHASES).toEqual([
        "landing",
        "consent",
        "starting",
        "question",
        "submitting",
        "completing",
        "completed",
        "error",
      ]);
    },
  );

  it.each(STUDY_PHASES)(
    "accepts the valid phase %s",
    (phase) => {
      expect(isStudyPhase(phase)).toBe(true);

      const typedPhase: StudyPhase = phase;

      expect(typedPhase).toBe(phase);
    },
  );

  it.each([
    "",
    "finished",
    "QUESTION",
    1,
    false,
    null,
    undefined,
    {},
    [],
  ])(
    "rejects an invalid phase value: %o",
    (value) => {
      expect(isStudyPhase(value)).toBe(false);
    },
  );
});
