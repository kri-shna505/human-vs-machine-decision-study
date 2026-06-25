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
  clearStudyProgress,
  loadStudyProgress,
  type StoredStudyProgress,
} from "../study/studyStorage";
import CompletionPage from "./CompletionPage";

vi.mock("../study/studyStorage", () => ({
  clearStudyProgress: vi.fn(),
  loadStudyProgress: vi.fn(),
}));

const mockedClearStudyProgress =
  vi.mocked(clearStudyProgress);
const mockedLoadStudyProgress =
  vi.mocked(loadStudyProgress);

const completedProgress: StoredStudyProgress = {
  version: 1,
  participantId: "participant-completion-test",
  sessionId: "session-completion-test",
  phase: "completed",
  currentScenarioIndex: 3,
  submittedScenarioIds: [
    "scenario-001",
    "scenario-002",
    "scenario-003",
  ],
};

function LocationProbe() {
  const location = useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
    </div>
  );
}

function renderCompletionPage() {
  return render(
    <MemoryRouter initialEntries={["/complete"]}>
      <Routes>
        <Route
          path="/complete"
          element={<CompletionPage />}
        />
        <Route
          path="/"
          element={<div>Landing destination</div>}
        />
      </Routes>

      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("CompletionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLoadStudyProgress.mockReturnValue(
      completedProgress,
    );
  });

  it(
    "displays the completed-study confirmation and session reference",
    () => {
      renderCompletionPage();

      expect(
        screen.getByRole("heading", {
          name: /thank you for participating/i,
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /your responses have been recorded successfully/i,
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          completedProgress.sessionId,
        ),
      ).toBeInTheDocument();
    },
  );

  it(
    "clears stored study progress when returning home",
    async () => {
      const user = userEvent.setup();

      renderCompletionPage();

      await user.click(
        screen.getByRole("link", {
          name: /return to home/i,
        }),
      );

      expect(
        mockedClearStudyProgress,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it(
    "navigates to the landing route when returning home",
    async () => {
      const user = userEvent.setup();

      renderCompletionPage();

      await user.click(
        screen.getByRole("link", {
          name: /return to home/i,
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("location"),
        ).toHaveTextContent("/");
      });

      expect(
        screen.getByText("Landing destination"),
      ).toBeInTheDocument();
    },
  );

  it(
    "renders safely without a session reference when progress is missing",
    () => {
      mockedLoadStudyProgress.mockReturnValue(null);

      renderCompletionPage();

      expect(
        screen.getByRole("heading", {
          name: /thank you for participating/i,
        }),
      ).toBeInTheDocument();

      expect(
        screen.queryByText(
          /anonymous session reference/i,
        ),
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole("link", {
          name: /return to home/i,
        }),
      ).toBeInTheDocument();
    },
  );
});
