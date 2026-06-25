import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ApiRequestError } from "../api/client";
import {
  completeStudySession,
  getScenarios,
  getStudySession,
  submitHumanResponse,
} from "../api/study";
import {
  loadStudyProgress,
  saveStudyProgress,
  type StoredStudyProgress,
} from "../study/studyStorage";
import type {
  CompletedStudySession,
  HumanResponse,
  Scenario,
  StudySessionDetail,
} from "../types/study";
import StudyPage from "./StudyPage";

vi.mock("../api/study", () => ({
  completeStudySession: vi.fn(),
  getScenarios: vi.fn(),
  getStudySession: vi.fn(),
  submitHumanResponse: vi.fn(),
}));

vi.mock(
  "../study/studyStorage",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../study/studyStorage")
      >();

    return {
      ...actual,
      loadStudyProgress: vi.fn(),
      saveStudyProgress: vi.fn(),
    };
  },
);

const mockedCompleteStudySession =
  vi.mocked(completeStudySession);
const mockedGetScenarios =
  vi.mocked(getScenarios);
const mockedGetStudySession =
  vi.mocked(getStudySession);
const mockedSubmitHumanResponse =
  vi.mocked(submitHumanResponse);
const mockedLoadStudyProgress =
  vi.mocked(loadStudyProgress);
const mockedSaveStudyProgress =
  vi.mocked(saveStudyProgress);

const progress: StoredStudyProgress = {
  version: 1,
  participantId: "participant-test-001",
  sessionId: "session-test-001",
  phase: "question",
  currentScenarioIndex: 0,
  submittedScenarioIds: [],
};

const scenarios: Scenario[] = [
  {
    id: "scenario-001",
    slug: "framing-effect",
    version: 1,
    title: "Framing Effect",
    category: "Contextual Bias",
    prompt: "Which public-health response would you choose?",
    is_active: true,
    options: [
      {
        id: "option-001-b",
        scenario_id: "scenario-001",
        code: "B",
        label: "Risky program",
        display_order: 2,
      },
      {
        id: "option-001-a",
        scenario_id: "scenario-001",
        code: "A",
        label: "Certain program",
        display_order: 1,
      },
    ],
  },
  {
    id: "scenario-002",
    slug: "risk-preference",
    version: 1,
    title: "Risk Preference",
    category: "Expected Value",
    prompt: "Which payment option would you choose?",
    is_active: true,
    options: [
      {
        id: "option-002-a",
        scenario_id: "scenario-002",
        code: "A",
        label: "Receive a certain payment",
        display_order: 1,
      },
      {
        id: "option-002-b",
        scenario_id: "scenario-002",
        code: "B",
        label: "Receive a probabilistic payment",
        display_order: 2,
      },
    ],
  },
];

function createSession(
  responses: HumanResponse[] = [],
  completedAt: string | null = null,
): StudySessionDetail {
  return {
    id: "session-test-001",
    participant_id: "participant-test-001",
    randomization_seed: 12345,
    status:
      completedAt === null
        ? "started"
        : "completed",
    started_at: "2026-06-25T10:00:00Z",
    completed_at: completedAt,
    responses,
  };
}

function createResponse(
  scenarioId: string,
  selectedOptionId: string,
  confidence = 75,
): HumanResponse {
  return {
    id: `response-${scenarioId}`,
    session_id: "session-test-001",
    scenario_id: scenarioId,
    selected_option_id: selectedOptionId,
    confidence,
    response_time_ms: 500,
    answered_at: "2026-06-25T10:01:00Z",
  };
}

function createCompletedSession(): CompletedStudySession {
  return {
    id: "session-test-001",
    participant_id: "participant-test-001",
    randomization_seed: 12345,
    status: "completed",
    started_at: "2026-06-25T10:00:00Z",
    completed_at: "2026-06-25T10:05:00Z",
    response_count: 2,
  };
}

function LocationProbe() {
  const location = useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
    </div>
  );
}

function renderStudyPage(
  loadedScenarios: Scenario[] = scenarios,
) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/study",
          state: {
            scenarios: loadedScenarios,
          },
        },
      ]}
    >
      <Routes>
        <Route
          path="/study"
          element={<StudyPage />}
        />
        <Route
          path="/complete"
          element={<div>Completion destination</div>}
        />
        <Route
          path="/consent"
          element={<div>Consent destination</div>}
        />
      </Routes>

      <LocationProbe />
    </MemoryRouter>,
  );
}

async function answerCurrentScenario(
  optionName: RegExp,
  confidence: string,
) {
  const user = userEvent.setup();

  await user.click(
    await screen.findByRole("radio", {
      name: optionName,
    }),
  );

  await user.type(
    screen.getByRole("spinbutton", {
      name: /confidence in your answer/i,
    }),
    confidence,
  );

  return user;
}

function createDeferred<T>() {
  let resolve!: (
    value: T | PromiseLike<T>,
  ) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );

  return {
    promise,
    resolve,
    reject,
  };
}

describe("StudyPage workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedLoadStudyProgress.mockReturnValue(
      progress,
    );
    mockedGetStudySession.mockResolvedValue(
      createSession(),
    );
    mockedGetScenarios.mockResolvedValue(
      scenarios,
    );
    mockedSubmitHumanResponse.mockResolvedValue(
      createResponse(
        "scenario-001",
        "option-001-b",
      ),
    );
    mockedCompleteStudySession.mockResolvedValue(
      createCompletedSession(),
    );

    Object.defineProperty(
      window,
      "scrollTo",
      {
        configurable: true,
        value: vi.fn(),
      },
    );
  });

  it(
    "renders the first unsubmitted scenario and sorts its options",
    async () => {
      renderStudyPage();

      expect(
        await screen.findByRole("heading", {
          name: "Framing Effect",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByText("Question 1 of 2"),
      ).toBeInTheDocument();

      const radios =
        screen.getAllByRole("radio");

      expect(radios).toHaveLength(2);
      expect(radios[0]).toHaveAccessibleName(
        /Certain program/i,
      );
      expect(radios[1]).toHaveAccessibleName(
        /Risky program/i,
      );

      expect(
        mockedGetScenarios,
      ).not.toHaveBeenCalled();
      expect(
        mockedGetStudySession,
      ).toHaveBeenCalledWith(
        "session-test-001",
        expect.any(AbortSignal),
      );
    },
  );

  it(
    "validates answer selection and confidence before submission",
    async () => {
      const user = userEvent.setup();

      renderStudyPage();

      const submitButton =
        await screen.findByRole("button", {
          name: /submit and continue/i,
        });

      await user.click(submitButton);

      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent(
        "Select one answer before continuing.",
      );

      await user.click(
        screen.getByRole("radio", {
          name: /Risky program/i,
        }),
      );

      await user.type(
        screen.getByRole("spinbutton", {
          name: /confidence in your answer/i,
        }),
        "101",
      );

      const form = submitButton.closest("form");

      if (!form) {
        throw new Error(
          "The response form was not found.",
        );
      }

      // Bypass the browser's native max=100 constraint so the
      // component's own validation branch is exercised.
      fireEvent.submit(form);

      expect(
        await screen.findByRole("alert"),
      ).toHaveTextContent(
        "Enter confidence as a whole number from 0 to 100.",
      );

      expect(
        mockedSubmitHumanResponse,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    "submits a response, stores progress, and advances to the next scenario",
    async () => {
      renderStudyPage();

      const user = userEvent.setup();

      await screen.findByRole("heading", {
        name: "Framing Effect",
      });

      await user.click(
        screen.getByRole("radio", {
          name: /Risky program/i,
        }),
      );

      await user.type(
        screen.getByRole("spinbutton", {
          name: /confidence in your answer/i,
        }),
        "75",
      );

      await user.click(
        screen.getByRole("button", {
          name: /submit and continue/i,
        }),
      );

      expect(
        await screen.findByRole("heading", {
          name: "Risk Preference",
        }),
      ).toBeInTheDocument();

      expect(
        mockedSubmitHumanResponse,
      ).toHaveBeenCalledWith(
        "session-test-001",
        {
          scenario_id: "scenario-001",
          selected_option_id:
            "option-001-b",
          confidence: 75,
          response_time_ms:
            expect.any(Number),
        },
      );

      expect(
        mockedSaveStudyProgress,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "question",
          currentScenarioIndex: 1,
          submittedScenarioIds: [
            "scenario-001",
          ],
        }),
      );

      expect(
        screen.getByText("Question 2 of 2"),
      ).toBeInTheDocument();
    },
  );

  it(
    "prevents a second submission while the first request is pending",
    async () => {
      const deferred =
        createDeferred<HumanResponse>();

      mockedSubmitHumanResponse.mockReturnValue(
        deferred.promise,
      );

      renderStudyPage();

      const user =
        await answerCurrentScenario(
          /Risky program/i,
          "70",
        );

      const submitButton =
        screen.getByRole("button", {
          name: /submit and continue/i,
        });

      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      const form = submitButton.closest("form");

      if (!form) {
        throw new Error(
          "The response form was not found.",
        );
      }

      fireEvent.submit(form);

      expect(
        mockedSubmitHumanResponse,
      ).toHaveBeenCalledTimes(1);

      deferred.resolve(
        createResponse(
          "scenario-001",
          "option-001-b",
          70,
        ),
      );

      expect(
        await screen.findByRole("heading", {
          name: "Risk Preference",
        }),
      ).toBeInTheDocument();
    },
  );

  it(
    "synchronizes saved responses after a duplicate-response conflict",
    async () => {
      mockedGetStudySession
        .mockResolvedValueOnce(
          createSession(),
        )
        .mockResolvedValueOnce(
          createSession([
            createResponse(
              "scenario-001",
              "option-001-b",
            ),
          ]),
        );

      mockedSubmitHumanResponse.mockRejectedValue(
        new ApiRequestError(
          "Response already exists.",
          409,
          {
            detail:
              "Response already exists.",
          },
        ),
      );

      renderStudyPage();

      const user =
        await answerCurrentScenario(
          /Risky program/i,
          "80",
        );

      await user.click(
        screen.getByRole("button", {
          name: /submit and continue/i,
        }),
      );

      expect(
        await screen.findByRole("heading", {
          name: "Risk Preference",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("status"),
      ).toHaveTextContent(
        "Your saved responses were synchronized.",
      );

      expect(
        mockedGetStudySession,
      ).toHaveBeenCalledTimes(2);

      expect(
        mockedSaveStudyProgress,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "question",
          currentScenarioIndex: 1,
          submittedScenarioIds: [
            "scenario-001",
          ],
        }),
      );
    },
  );

  it(
    "submits the final response, completes the session, and navigates to /complete",
    async () => {
      renderStudyPage([scenarios[0]]);

      const user =
        await answerCurrentScenario(
          /Risky program/i,
          "90",
        );

      await user.click(
        screen.getByRole("button", {
          name: /submit final response/i,
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("location"),
        ).toHaveTextContent("/complete");
      });

      expect(
        mockedCompleteStudySession,
      ).toHaveBeenCalledWith(
        "session-test-001",
      );

      expect(
        mockedSaveStudyProgress,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "completing",
          currentScenarioIndex: 1,
          submittedScenarioIds: [
            "scenario-001",
          ],
        }),
      );

      expect(
        mockedSaveStudyProgress,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "completed",
          currentScenarioIndex: 1,
          submittedScenarioIds: [
            "scenario-001",
          ],
        }),
      );

      expect(
        screen.getByText(
          "Completion destination",
        ),
      ).toBeInTheDocument();
    },
  );
});
