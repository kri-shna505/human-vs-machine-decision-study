import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  clearStudyProgress,
  loadStudyProgress,
  saveStudyProgress,
  STUDY_STORAGE_KEY,
  type StoredStudyProgress,
} from "./studyStorage";

function createProgress(
  overrides: Partial<StoredStudyProgress> = {},
): StoredStudyProgress {
  return {
    version: 1,
    participantId: "participant-test-001",
    sessionId: "session-test-001",
    phase: "question",
    currentScenarioIndex: 1,
    submittedScenarioIds: ["scenario-001"],
    ...overrides,
  };
}

describe("studyStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads study progress", () => {
    const progress = createProgress();

    saveStudyProgress(progress);

    expect(loadStudyProgress()).toEqual(progress);
  });

  it("preserves completed study progress", () => {
    const completedProgress = createProgress({
      phase: "completed",
      currentScenarioIndex: 3,
      submittedScenarioIds: [
        "scenario-001",
        "scenario-002",
        "scenario-003",
      ],
    });

    saveStudyProgress(completedProgress);

    expect(loadStudyProgress()).toEqual(
      completedProgress,
    );
  });

  it("clears saved study progress", () => {
    saveStudyProgress(createProgress());

    expect(loadStudyProgress()).not.toBeNull();

    clearStudyProgress();

    expect(loadStudyProgress()).toBeNull();
  });

  it("rejects invalid JSON without throwing", () => {
    localStorage.setItem(
      STUDY_STORAGE_KEY,
      "{this-is-not-valid-json",
    );

    expect(() => loadStudyProgress()).not.toThrow();
    expect(loadStudyProgress()).toBeNull();
    expect(
      localStorage.getItem(STUDY_STORAGE_KEY),
    ).toBeNull();
  });

  it("rejects structurally malformed progress", () => {
    localStorage.setItem(
      STUDY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        participantId: 123,
        sessionId: null,
        phase: "unknown-phase",
        currentScenarioIndex: -1,
        submittedScenarioIds: "not-an-array",
      }),
    );

    expect(loadStudyProgress()).toBeNull();
    expect(
      localStorage.getItem(STUDY_STORAGE_KEY),
    ).toBeNull();
  });

  it("normalizes duplicate scenario identifiers", () => {
    saveStudyProgress(
      createProgress({
        submittedScenarioIds: [
          "scenario-001",
          "scenario-001",
          " scenario-002 ",
        ],
      }),
    );

    expect(
      loadStudyProgress()?.submittedScenarioIds,
    ).toEqual([
      "scenario-001",
      "scenario-002",
    ]);
  });
});
