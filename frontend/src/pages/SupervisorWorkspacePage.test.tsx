import {
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  afterEach,
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
  SUPERVISOR_SESSION_STORAGE_KEY,
} from "../supervisor/supervisorStorage";
import SupervisorWorkspacePage from "./SupervisorWorkspacePage";

function renderSupervisorWorkspacePage() {
  return render(
    <MemoryRouter>
      <SupervisorWorkspacePage />
    </MemoryRouter>,
  );
}

async function initializeAndBegin() {
  const user = userEvent.setup();

  renderSupervisorWorkspacePage();

  await user.click(
    screen.getByRole("button", {
      name: /start supervisor session/i,
    }),
  );

  await user.click(
    screen.getByRole("button", {
      name: /begin guided questions/i,
    }),
  );

  return user;
}

describe("SupervisorWorkspacePage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explains the research-data boundary", () => {
    renderSupervisorWorkspacePage();

    expect(
      screen.getByRole("heading", {
        name: /explore the study without affecting participant data/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/excluded from research results/i),
    ).toBeInTheDocument();

    expect(screen.getByText("Never created")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("initializes locally without making a network request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    renderSupervisorWorkspacePage();

    await user.click(
      screen.getByRole("button", {
        name: /start supervisor session/i,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: /supervisor workspace is ready/i,
      }),
    ).toBeInTheDocument();

    expect(
      sessionStorage.getItem(SUPERVISOR_SESSION_STORAGE_KEY),
    ).not.toBeNull();

    expect(localStorage.length).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a response and completes all guided questions", async () => {
    const user = await initializeAndBegin();

    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeDisabled();

    await user.click(
      screen.getByLabelText("Linda is a bank teller."),
    );

    await user.click(
      screen.getByRole("button", { name: "Continue" }),
    );

    expect(
      screen.getByRole("heading", { name: "Framing Effect" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByLabelText(
        "Program A: 200 people will be saved.",
      ),
    );

    await user.click(
      screen.getByRole("button", { name: "Continue" }),
    );

    await user.click(
      screen.getByLabelText("Receive $500 with certainty."),
    );

    await user.click(
      screen.getByRole("button", {
        name: /finish experience/i,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: /your responses are ready for review/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(/70% confident/i),
    ).toHaveLength(3);

    expect(
      screen.getByText("Receive $500 with certainty."),
    ).toBeInTheDocument();
  });

  it("restores the next question from session storage", () => {
    let session = startSupervisorQuestions(
      initializeSupervisorSession({
        sessionId: "supervisor-refresh-test",
        startedAt: "2026-06-26T12:00:00.000Z",
      }),
    );

    session = saveSupervisorAnswer(session, {
      questionId: "conjunction-probability",
      optionId: "bank-teller",
      confidence: 74,
      answeredAt: "2026-06-26T12:05:00.000Z",
    });

    expect(session.currentQuestionIndex).toBe(1);

    renderSupervisorWorkspacePage();

    expect(
      screen.getByRole("heading", { name: "Framing Effect" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Question 2 of 3"),
    ).toBeInTheDocument();
  });

  it("moves back to an answered question", async () => {
    const user = await initializeAndBegin();

    await user.click(
      screen.getByLabelText("Linda is a bank teller."),
    );

    await user.click(
      screen.getByRole("button", { name: "Continue" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Previous" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Conjunction Fallacy",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Linda is a bank teller."),
    ).toBeChecked();
  });

  it("restarts questions and resets the full session", async () => {
    const user = await initializeAndBegin();

    await user.click(
      screen.getByLabelText("Linda is a bank teller."),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue" }),
    );

    await user.click(
      screen.getByLabelText(
        "Program A: 200 people will be saved.",
      ),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue" }),
    );

    await user.click(
      screen.getByLabelText("Receive $500 with certainty."),
    );
    await user.click(
      screen.getByRole("button", {
        name: /finish experience/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /restart questions/i,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Conjunction Fallacy",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeDisabled();

    const storedSession = sessionStorage.getItem(
      SUPERVISOR_SESSION_STORAGE_KEY,
    );

    expect(storedSession).not.toBeNull();

    sessionStorage.clear();

    renderSupervisorWorkspacePage();

    expect(
      screen.getAllByRole("button", {
        name: /start supervisor session/i,
      }),
    ).not.toHaveLength(0);
  });
});
