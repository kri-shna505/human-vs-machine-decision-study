import {
  render,
  screen,
} from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  initializeSupervisorSession,
  saveSupervisorAnswer,
  startSupervisorQuestions,
} from "../supervisor/supervisorStorage";
import SupervisorAnalysisPage from "./SupervisorAnalysisPage";

function completeSupervisorSession(): void {
  let session = startSupervisorQuestions(
    initializeSupervisorSession({
      sessionId: "supervisor-analysis-test",
      startedAt: "2026-06-26T12:00:00.000Z",
    }),
  );

  session = saveSupervisorAnswer(session, {
    questionId: "conjunction-probability",
    optionId: "bank-teller",
    confidence: 60,
    answeredAt: "2026-06-26T12:01:00.000Z",
  });

  session = saveSupervisorAnswer(session, {
    questionId: "framing-program",
    optionId: "certain-save",
    confidence: 70,
    answeredAt: "2026-06-26T12:02:00.000Z",
  });

  saveSupervisorAnswer(session, {
    questionId: "risk-reward",
    optionId: "variable-reward",
    confidence: 80,
    answeredAt: "2026-06-26T12:03:00.000Z",
  });
}

function renderAnalysisRoute() {
  return render(
    <MemoryRouter initialEntries={["/supervisor/analysis"]}>
      <Routes>
        <Route
          path="/supervisor/analysis"
          element={<SupervisorAnalysisPage />}
        />
        <Route
          path="/supervisor"
          element={<div>Supervisor workspace route</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SupervisorAnalysisPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("redirects when no completed supervisor session exists", () => {
    renderAnalysisRoute();

    expect(
      screen.getByText("Supervisor workspace route"),
    ).toBeInTheDocument();
  });

  it("renders presentation-only comparison cards and charts", () => {
    completeSupervisorSession();
    renderAnalysisRoute();

    expect(
      screen.getByRole("heading", {
        name: /human and model decision patterns/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/not live research results/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Human benchmark",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Reasoning model",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("img", {
        name: /scenario alignment comparison chart/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("img", {
        name: /confidence comparison chart/i,
      }),
    ).toBeInTheDocument();
  });

  it("summarizes local confidence and consensus alignment", () => {
    completeSupervisorSession();
    renderAnalysisRoute();

    expect(screen.getAllByText("70%")).toHaveLength(2);
    expect(screen.getByText("3/3")).toBeInTheDocument();

    expect(
      screen.getByText("Linda is a bank teller."),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Receive $500 with certainty."),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText(
        "A 50% chance to receive $1,100 and a 50% chance to receive $0.",
      ),
    ).toBeInTheDocument();
  });

  it("does not request live research data", () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    completeSupervisorSession();
    renderAnalysisRoute();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);

    vi.unstubAllGlobals();
  });

  it("provides navigation back to the isolated workspace", () => {
    completeSupervisorSession();
    renderAnalysisRoute();

    expect(
      screen.getAllByRole("link", {
        name: /return to supervisor workspace/i,
      }),
    ).not.toHaveLength(0);
  });
});
