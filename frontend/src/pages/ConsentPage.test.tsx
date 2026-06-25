import {
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

import {
  createParticipant,
  createStudySession,
  getScenarios,
} from "../api/study";
import {
  saveStudyProgress,
} from "../study/studyStorage";
import ConsentPage from "./ConsentPage";

vi.mock("../api/study", () => ({
  createParticipant: vi.fn(),
  createStudySession: vi.fn(),
  getScenarios: vi.fn(),
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
      saveStudyProgress: vi.fn(),
    };
  },
);

const mockedCreateParticipant =
  vi.mocked(createParticipant);
const mockedCreateStudySession =
  vi.mocked(createStudySession);
const mockedGetScenarios =
  vi.mocked(getScenarios);
const mockedSaveStudyProgress =
  vi.mocked(saveStudyProgress);

function LocationProbe() {
  const location = useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
    </div>
  );
}

function renderConsentPage() {
  return render(
    <MemoryRouter initialEntries={["/consent"]}>
      <Routes>
        <Route
          path="/consent"
          element={<ConsentPage />}
        />
        <Route
          path="/study"
          element={<div>Study destination</div>}
        />
      </Routes>

      <LocationProbe />
    </MemoryRouter>,
  );
}

function mockSuccessfulParticipantCreation() {
  const participant = {
    id: "participant-test-001",
  } as unknown as Awaited<
    ReturnType<typeof createParticipant>
  >;

  mockedCreateParticipant.mockResolvedValue(
    participant,
  );
}

function mockSuccessfulSessionCreation() {
  const studySession = {
    id: "session-test-001",
    participant_id: "participant-test-001",
  } as unknown as Awaited<
    ReturnType<typeof createStudySession>
  >;

  mockedCreateStudySession.mockResolvedValue(
    studySession,
  );
}

function mockSuccessfulScenarioLoading() {
  const scenarios = [
    {
      id: "scenario-001",
      title: "Framing Effect",
      category: "Contextual Bias",
      prompt: "Choose one response.",
      options: [
        {
          id: "option-a",
          code: "A",
          label: "Option A",
        },
        {
          id: "option-b",
          code: "B",
          label: "Option B",
        },
      ],
    },
  ] as unknown as Awaited<
    ReturnType<typeof getScenarios>
  >;

  mockedGetScenarios.mockResolvedValue(
    scenarios,
  );
}

describe("ConsentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "keeps the continue button disabled until consent is checked",
    async () => {
      const user = userEvent.setup();

      renderConsentPage();

      const checkbox =
        screen.getByRole("checkbox");
      const continueButton =
        screen.getByRole("button", {
          name: /consent and continue/i,
        });

      expect(checkbox).not.toBeChecked();
      expect(continueButton).toBeDisabled();

      await user.click(checkbox);

      expect(checkbox).toBeChecked();
      expect(continueButton).toBeEnabled();
    },
  );

  it(
    "creates the participant and session, loads scenarios, saves progress, and navigates to /study",
    async () => {
      const user = userEvent.setup();

      mockSuccessfulParticipantCreation();
      mockSuccessfulSessionCreation();
      mockSuccessfulScenarioLoading();

      renderConsentPage();

      await user.click(
        screen.getByRole("checkbox"),
      );
      await user.click(
        screen.getByRole("button", {
          name: /consent and continue/i,
        }),
      );

      await waitFor(() => {
        expect(
          mockedCreateParticipant,
        ).toHaveBeenCalledTimes(1);
      });

      expect(
        mockedCreateParticipant,
      ).toHaveBeenCalledWith({
        consent: true,
      });

      await waitFor(() => {
        expect(
          mockedCreateStudySession,
        ).toHaveBeenCalledTimes(1);
      });

      expect(
        mockedCreateStudySession,
      ).toHaveBeenCalledWith({
        participant_id:
          "participant-test-001",
      });

      await waitFor(() => {
        expect(
          mockedGetScenarios,
        ).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(
          mockedSaveStudyProgress,
        ).toHaveBeenCalledTimes(1);
      });

      expect(
        mockedSaveStudyProgress,
      ).toHaveBeenCalledWith({
        version: 1,
        participantId:
          "participant-test-001",
        sessionId: "session-test-001",
        phase: "question",
        currentScenarioIndex: 0,
        submittedScenarioIds: [],
      });

      await waitFor(() => {
        expect(
          screen.getByTestId("location"),
        ).toHaveTextContent("/study");
      });

      expect(
        screen.getByText("Study destination"),
      ).toBeInTheDocument();
    },
  );

  it(
    "shows an error and stops when participant creation fails",
    async () => {
      const user = userEvent.setup();

      mockedCreateParticipant.mockRejectedValue(
        new Error(
          "Participant creation failed.",
        ),
      );

      renderConsentPage();

      await user.click(
        screen.getByRole("checkbox"),
      );
      await user.click(
        screen.getByRole("button", {
          name: /consent and continue/i,
        }),
      );

      expect(
        await screen.findByText(
          "Participant creation failed.",
        ),
      ).toBeInTheDocument();

      expect(
        mockedCreateStudySession,
      ).not.toHaveBeenCalled();
      expect(
        mockedGetScenarios,
      ).not.toHaveBeenCalled();
      expect(
        mockedSaveStudyProgress,
      ).not.toHaveBeenCalled();

      expect(
        screen.getByTestId("location"),
      ).toHaveTextContent("/consent");
    },
  );

  it(
    "shows an error and stops when session creation fails",
    async () => {
      const user = userEvent.setup();

      mockSuccessfulParticipantCreation();
      mockedCreateStudySession.mockRejectedValue(
        new Error(
          "Session creation failed.",
        ),
      );

      renderConsentPage();

      await user.click(
        screen.getByRole("checkbox"),
      );
      await user.click(
        screen.getByRole("button", {
          name: /consent and continue/i,
        }),
      );

      expect(
        await screen.findByText(
          "Session creation failed.",
        ),
      ).toBeInTheDocument();

      expect(
        mockedCreateParticipant,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockedCreateStudySession,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockedGetScenarios,
      ).not.toHaveBeenCalled();
      expect(
        mockedSaveStudyProgress,
      ).not.toHaveBeenCalled();

      expect(
        screen.getByTestId("location"),
      ).toHaveTextContent("/consent");
    },
  );

  it(
    "shows an error and does not save progress when scenario loading fails",
    async () => {
      const user = userEvent.setup();

      mockSuccessfulParticipantCreation();
      mockSuccessfulSessionCreation();
      mockedGetScenarios.mockRejectedValue(
        new Error(
          "Scenario loading failed.",
        ),
      );

      renderConsentPage();

      await user.click(
        screen.getByRole("checkbox"),
      );
      await user.click(
        screen.getByRole("button", {
          name: /consent and continue/i,
        }),
      );

      expect(
        await screen.findByText(
          "Scenario loading failed.",
        ),
      ).toBeInTheDocument();

      expect(
        mockedCreateParticipant,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockedCreateStudySession,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockedGetScenarios,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockedSaveStudyProgress,
      ).not.toHaveBeenCalled();

      expect(
        screen.getByTestId("location"),
      ).toHaveTextContent("/consent");
    },
  );
});
