import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  MemoryRouter,
  useLocation,
} from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import App from "./App";
import {
  clearStudyProgress,
  saveStudyProgress,
  type StoredStudyProgress,
} from "./study/studyStorage";

vi.mock("./pages/LandingPage", () => ({
  default: () => <div>Landing page</div>,
}));

vi.mock("./pages/ConsentPage", () => ({
  default: () => <div>Consent page</div>,
}));

vi.mock("./pages/StudyPage", () => ({
  default: () => <div>Study page</div>,
}));

vi.mock("./pages/CompletionPage", () => ({
  default: () => <div>Completion page</div>,
}));

vi.mock("./pages/SupervisorWorkspacePage", () => ({
  default: () => <div>Supervisor workspace page</div>,
}));

vi.mock("./pages/SupervisorAnalysisPage", () => ({
  default: () => <div>Supervisor analysis page</div>,
}));

function LocationProbe() {
  const location = useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
    </div>
  );
}

function renderRoute(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function createProgress(
  overrides: Partial<StoredStudyProgress> = {},
): StoredStudyProgress {
  return {
    version: 1,
    participantId: "participant-route-test",
    sessionId: "session-route-test",
    phase: "question",
    currentScenarioIndex: 0,
    submittedScenarioIds: [],
    ...overrides,
  };
}

describe("App route guards", () => {
  beforeEach(() => {
    clearStudyProgress();
  });

  it(
    "redirects /study to /consent when no progress exists",
    async () => {
      renderRoute("/study");

      await waitFor(() => {
        expect(
          screen.getByTestId("location"),
        ).toHaveTextContent("/consent");
      });

      expect(
        screen.getByText("Consent page"),
      ).toBeInTheDocument();
    },
  );

  it(
    "redirects /complete to /consent when no progress exists",
    async () => {
      renderRoute("/complete");

      await waitFor(() => {
        expect(
          screen.getByTestId("location"),
        ).toHaveTextContent("/consent");
      });

      expect(
        screen.getByText("Consent page"),
      ).toBeInTheDocument();
    },
  );

  it("allows /study for an active study session", () => {
    saveStudyProgress(createProgress());

    renderRoute("/study");

    expect(
      screen.getByTestId("location"),
    ).toHaveTextContent("/study");

    expect(
      screen.getByText("Study page"),
    ).toBeInTheDocument();
  });

  it(
    "redirects /complete to /consent while the session is incomplete",
    async () => {
      saveStudyProgress(createProgress());

      renderRoute("/complete");

      await waitFor(() => {
        expect(
          screen.getByTestId("location"),
        ).toHaveTextContent("/consent");
      });

      expect(
        screen.getByText("Consent page"),
      ).toBeInTheDocument();
    },
  );

  it(
    "redirects /study to /complete after completion",
    async () => {
      saveStudyProgress(
        createProgress({
          phase: "completed",
          currentScenarioIndex: 3,
          submittedScenarioIds: [
            "scenario-001",
            "scenario-002",
            "scenario-003",
          ],
        }),
      );

      renderRoute("/study");

      await waitFor(() => {
        expect(
          screen.getByTestId("location"),
        ).toHaveTextContent("/complete");
      });

      expect(
        screen.getByText("Completion page"),
      ).toBeInTheDocument();
    },
  );

  it("allows /complete after completion", () => {
    saveStudyProgress(
      createProgress({
        phase: "completed",
        currentScenarioIndex: 3,
        submittedScenarioIds: [
          "scenario-001",
          "scenario-002",
          "scenario-003",
        ],
      }),
    );

    renderRoute("/complete");

    expect(
      screen.getByTestId("location"),
    ).toHaveTextContent("/complete");

    expect(
      screen.getByText("Completion page"),
    ).toBeInTheDocument();
  });

  it("maps the supervisor workspace route", () => {
    renderRoute("/supervisor");

    expect(
      screen.getByText("Supervisor workspace page"),
    ).toBeInTheDocument();
  });

  it("maps the comparative analysis route", () => {
    renderRoute("/supervisor/analysis");

    expect(
      screen.getByTestId("location"),
    ).toHaveTextContent("/supervisor/analysis");

    expect(
      screen.getByText("Supervisor analysis page"),
    ).toBeInTheDocument();
  });
});
