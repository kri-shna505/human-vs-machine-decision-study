import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  CompletedStudySession,
  HumanResponse,
  Participant,
  Scenario,
  StudySession,
  StudySessionDetail,
} from "../types/study";
import { apiRequest } from "./client";
import {
  completeStudySession,
  createParticipant,
  createStudySession,
  getScenarios,
  getStudySession,
  submitHumanResponse,
} from "./study";

vi.mock("./client", () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest =
  vi.mocked(apiRequest);

const participant: Participant = {
  id: "participant-001",
  participant_code: "P-001",
  consented_at: "2026-06-25T10:00:00Z",
  created_at: "2026-06-25T10:00:00Z",
};

const session: StudySession = {
  id: "session-001",
  participant_id: "participant-001",
  randomization_seed: 12345,
  status: "started",
  started_at: "2026-06-25T10:01:00Z",
  completed_at: null,
};

const response: HumanResponse = {
  id: "response-001",
  session_id: "session-001",
  scenario_id: "scenario-001",
  selected_option_id: "option-001",
  confidence: 80,
  response_time_ms: 1250,
  answered_at: "2026-06-25T10:02:00Z",
};

const scenario: Scenario = {
  id: "scenario-001",
  slug: "framing-effect",
  version: 1,
  title: "Framing Effect",
  category: "Contextual Bias",
  prompt: "Choose one response.",
  is_active: true,
  options: [],
};

describe("study API wrappers", () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it(
    "retrieves active scenarios",
    async () => {
      const controller = new AbortController();

      mockedApiRequest.mockResolvedValueOnce(
        [scenario] as never,
      );

      await expect(
        getScenarios(controller.signal),
      ).resolves.toEqual([scenario]);

      expect(
        mockedApiRequest,
      ).toHaveBeenCalledWith(
        "/api/v1/scenarios",
        {
          method: "GET",
          signal: controller.signal,
        },
      );
    },
  );

  it(
    "creates a participant with serialized consent",
    async () => {
      const controller = new AbortController();
      const payload = {
        consent: true,
      };

      mockedApiRequest.mockResolvedValueOnce(
        participant as never,
      );

      await expect(
        createParticipant(
          payload,
          controller.signal,
        ),
      ).resolves.toEqual(participant);

      expect(
        mockedApiRequest,
      ).toHaveBeenCalledWith(
        "/api/v1/participants",
        {
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    },
  );

  it(
    "creates a study session with the participant ID",
    async () => {
      const controller = new AbortController();
      const payload = {
        participant_id: "participant-001",
      };

      mockedApiRequest.mockResolvedValueOnce(
        session as never,
      );

      await expect(
        createStudySession(
          payload,
          controller.signal,
        ),
      ).resolves.toEqual(session);

      expect(
        mockedApiRequest,
      ).toHaveBeenCalledWith(
        "/api/v1/sessions",
        {
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    },
  );

  it(
    "retrieves a session using an encoded session ID",
    async () => {
      const controller = new AbortController();
      const detail: StudySessionDetail = {
        ...session,
        responses: [response],
      };

      mockedApiRequest.mockResolvedValueOnce(
        detail as never,
      );

      await expect(
        getStudySession(
          "session/with spaces",
          controller.signal,
        ),
      ).resolves.toEqual(detail);

      expect(
        mockedApiRequest,
      ).toHaveBeenCalledWith(
        "/api/v1/sessions/session%2Fwith%20spaces",
        {
          method: "GET",
          signal: controller.signal,
        },
      );
    },
  );

  it(
    "submits a human response to an encoded session URL",
    async () => {
      const controller = new AbortController();
      const payload = {
        scenario_id: "scenario-001",
        selected_option_id: "option-001",
        confidence: 80,
        response_time_ms: 1250,
      };

      mockedApiRequest.mockResolvedValueOnce(
        response as never,
      );

      await expect(
        submitHumanResponse(
          "session/001",
          payload,
          controller.signal,
        ),
      ).resolves.toEqual(response);

      expect(
        mockedApiRequest,
      ).toHaveBeenCalledWith(
        "/api/v1/sessions/session%2F001/responses",
        {
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    },
  );

  it(
    "completes a study session using an encoded session ID",
    async () => {
      const controller = new AbortController();
      const completedSession:
        CompletedStudySession = {
          ...session,
          status: "completed",
          completed_at:
            "2026-06-25T10:05:00Z",
          response_count: 3,
        };

      mockedApiRequest.mockResolvedValueOnce(
        completedSession as never,
      );

      await expect(
        completeStudySession(
          "session/001",
          controller.signal,
        ),
      ).resolves.toEqual(completedSession);

      expect(
        mockedApiRequest,
      ).toHaveBeenCalledWith(
        "/api/v1/sessions/session%2F001/complete",
        {
          method: "POST",
          signal: controller.signal,
        },
      );
    },
  );
});
