import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  clearSupervisorSession,
  initializeSupervisorSession,
  loadSupervisorSession,
  restartSupervisorQuestions,
  saveSupervisorAnswer,
  setSupervisorQuestionIndex,
  startSupervisorQuestions,
  SUPERVISOR_SESSION_STORAGE_KEY,
} from "./supervisorStorage";

const FIRST_ANSWER = {
  questionId: "conjunction-probability",
  optionId: "bank-teller",
  confidence: 72,
  answeredAt: "2026-06-26T12:05:00.000Z",
};

describe("supervisorStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores an isolated ready session in sessionStorage", () => {
    const session = initializeSupervisorSession({
      sessionId: "supervisor-storage-test",
      startedAt: "2026-06-26T12:00:00.000Z",
    });

    expect(session).toEqual({
      version: 2,
      sessionId: "supervisor-storage-test",
      startedAt: "2026-06-26T12:00:00.000Z",
      phase: "ready",
      currentQuestionIndex: 0,
      answers: [],
      storage: "session",
      affectsResearchData: false,
    });

    expect(loadSupervisorSession()).toEqual(session);
    expect(localStorage.length).toBe(0);
  });

  it("starts and persists the guided questions", () => {
    const session = initializeSupervisorSession({
      sessionId: "supervisor-start-test",
    });

    const updatedSession = startSupervisorQuestions(session);

    expect(updatedSession.phase).toBe("questions");
    expect(updatedSession.currentQuestionIndex).toBe(0);
    expect(loadSupervisorSession()).toEqual(updatedSession);
  });

  it("saves answers, advances questions, and completes the experience", () => {
    let session = startSupervisorQuestions(
      initializeSupervisorSession({
        sessionId: "supervisor-answer-test",
      }),
    );

    session = saveSupervisorAnswer(session, FIRST_ANSWER);

    expect(session.phase).toBe("questions");
    expect(session.currentQuestionIndex).toBe(1);
    expect(session.answers).toEqual([FIRST_ANSWER]);

    session = saveSupervisorAnswer(session, {
      questionId: "framing-program",
      optionId: "certain-save",
      confidence: 65,
      answeredAt: "2026-06-26T12:06:00.000Z",
    });

    session = saveSupervisorAnswer(session, {
      questionId: "risk-reward",
      optionId: "variable-reward",
      confidence: 81,
      answeredAt: "2026-06-26T12:07:00.000Z",
    });

    expect(session.phase).toBe("complete");
    expect(session.currentQuestionIndex).toBe(2);
    expect(session.answers).toHaveLength(3);
    expect(session.completedAt).toEqual(expect.any(String));
    expect(loadSupervisorSession()).toEqual(session);
  });

  it("allows navigation to an answered question and a clean restart", () => {
    let session = startSupervisorQuestions(
      initializeSupervisorSession({
        sessionId: "supervisor-navigation-test",
      }),
    );

    session = saveSupervisorAnswer(session, FIRST_ANSWER);
    session = setSupervisorQuestionIndex(session, 0);

    expect(session.currentQuestionIndex).toBe(0);
    expect(session.phase).toBe("questions");

    session = restartSupervisorQuestions(session);

    expect(session.currentQuestionIndex).toBe(0);
    expect(session.answers).toEqual([]);
    expect(session.phase).toBe("questions");
  });

  it("rejects unknown questions, options, confidence, and indexes", () => {
    const session = startSupervisorQuestions(
      initializeSupervisorSession({
        sessionId: "supervisor-validation-test",
      }),
    );

    expect(() =>
      saveSupervisorAnswer(session, {
        ...FIRST_ANSWER,
        questionId: "unknown-question",
      }),
    ).toThrow("Unknown supervisor question.");

    expect(() =>
      saveSupervisorAnswer(session, {
        ...FIRST_ANSWER,
        optionId: "unknown-option",
      }),
    ).toThrow("Unknown supervisor response option.");

    expect(() =>
      saveSupervisorAnswer(session, {
        ...FIRST_ANSWER,
        confidence: 101,
      }),
    ).toThrow("Confidence must be an integer from 0 to 100.");

    expect(() =>
      setSupervisorQuestionIndex(session, -1),
    ).toThrow("Supervisor question index is out of range.");
  });

  it("removes malformed and legacy workspace state", () => {
    sessionStorage.setItem(
      SUPERVISOR_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        affectsResearchData: true,
      }),
    );

    sessionStorage.setItem(
      "decision-study.supervisor-workspace.v1",
      "legacy-value",
    );

    expect(loadSupervisorSession()).toBeNull();

    expect(
      sessionStorage.getItem(SUPERVISOR_SESSION_STORAGE_KEY),
    ).toBeNull();

    expect(
      sessionStorage.getItem(
        "decision-study.supervisor-workspace.v1",
      ),
    ).toBeNull();
  });

  it("clears only supervisor workspace keys", () => {
    sessionStorage.setItem("other-session-key", "keep-me");

    initializeSupervisorSession({
      sessionId: "supervisor-clear-test",
    });

    clearSupervisorSession();

    expect(loadSupervisorSession()).toBeNull();
    expect(
      sessionStorage.getItem("other-session-key"),
    ).toBe("keep-me");
  });
});
