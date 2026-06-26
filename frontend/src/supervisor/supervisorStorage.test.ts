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
  SUPERVISOR_SESSION_STORAGE_KEY,
} from "./supervisorStorage";

describe("supervisorStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores an isolated session in sessionStorage", () => {
    const session = initializeSupervisorSession({
      sessionId: "supervisor-storage-test",
      startedAt: "2026-06-26T12:00:00.000Z",
    });

    expect(session).toEqual({
      version: 1,
      sessionId: "supervisor-storage-test",
      startedAt: "2026-06-26T12:00:00.000Z",
      status: "ready",
      storage: "session",
      affectsResearchData: false,
    });

    expect(loadSupervisorSession()).toEqual(session);
    expect(localStorage.length).toBe(0);
  });

  it("removes malformed workspace state", () => {
    sessionStorage.setItem(
      SUPERVISOR_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        affectsResearchData: true,
      }),
    );

    expect(loadSupervisorSession()).toBeNull();
    expect(
      sessionStorage.getItem(SUPERVISOR_SESSION_STORAGE_KEY),
    ).toBeNull();
  });

  it("clears only the supervisor session key", () => {
    sessionStorage.setItem("other-session-key", "keep-me");

    initializeSupervisorSession({
      sessionId: "supervisor-clear-test",
      startedAt: "2026-06-26T12:00:00.000Z",
    });

    clearSupervisorSession();

    expect(loadSupervisorSession()).toBeNull();
    expect(
      sessionStorage.getItem("other-session-key"),
    ).toBe("keep-me");
  });
});
