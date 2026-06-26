import {
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
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

describe("SupervisorWorkspacePage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
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

    expect(
      screen.getByText("Never created"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Disabled"),
    ).toBeInTheDocument();
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

    vi.unstubAllGlobals();
  });

  it("resets the isolated supervisor session", async () => {
    const user = userEvent.setup();

    renderSupervisorWorkspacePage();

    await user.click(
      screen.getByRole("button", {
        name: /start supervisor session/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /reset session/i,
      }),
    );

    expect(
      sessionStorage.getItem(SUPERVISOR_SESSION_STORAGE_KEY),
    ).toBeNull();

    expect(
      screen.getByRole("button", {
        name: /start supervisor session/i,
      }),
    ).toBeInTheDocument();
  });
});
