import {
  act,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  MemoryRouter,
} from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getApiHealth,
  type ApiHealthResponse,
} from "../api/health";
import LandingPage from "./LandingPage";

vi.mock("../api/health", () => ({
  getApiHealth: vi.fn(),
}));

const mockedGetApiHealth =
  vi.mocked(getApiHealth);

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

function createDeferred<T>() {
  let resolve!: (
    value: T | PromiseLike<T>,
  ) => void;

  const promise = new Promise<T>(
    (resolvePromise) => {
      resolve = resolvePromise;
    },
  );

  return {
    promise,
    resolve,
  };
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetApiHealth.mockResolvedValue({
      status: "healthy",
      service: "api",
    });
  });

  it(
    "renders the study introduction, navigation, and scenario summaries",
    async () => {
      renderLandingPage();

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /human vs machine decision study/i,
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("link", {
          name: /decision study home/i,
        }),
      ).toHaveAttribute("href", "/");

      expect(
        screen.getByRole("link", {
          name: /begin study/i,
        }),
      ).toHaveAttribute("href", "/consent");

      expect(
        screen.getByRole("link", {
          name: "Results",
        }),
      ).toHaveAttribute("href", "#results");

      expect(
        screen.getByRole("link", {
          name: "Researcher Access",
        }),
      ).toHaveAttribute(
        "href",
        "#researcher-access",
      );

      expect(
        screen.getByRole("heading", {
          name: "Conjunction Fallacy",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("heading", {
          name: "Framing Effect",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("heading", {
          name: "Risk Preference",
        }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(
          mockedGetApiHealth,
        ).toHaveBeenCalledTimes(1);
      });
    },
  );

  it(
    "does not display an outage alert when the backend is healthy",
    async () => {
      renderLandingPage();

      await waitFor(() => {
        expect(
          mockedGetApiHealth,
        ).toHaveBeenCalledTimes(1);
      });

      expect(
        screen.queryByRole("alert"),
      ).not.toBeInTheDocument();
    },
  );

  it.each<ApiHealthResponse>([
    {
      status: "degraded",
      service: "api",
    },
    {
      status: "healthy",
      service: "worker",
    },
  ])(
    "shows the unavailable message for an unhealthy response: %o",
    async (health) => {
      mockedGetApiHealth.mockResolvedValue(
        health,
      );

      renderLandingPage();

      expect(
        await screen.findByRole("alert"),
      ).toHaveTextContent(
        "Service temporarily unavailable",
      );
    },
  );

  it(
    "shows the unavailable message when the health request fails",
    async () => {
      mockedGetApiHealth.mockRejectedValue(
        new Error("Network failure"),
      );

      renderLandingPage();

      expect(
        await screen.findByRole("alert"),
      ).toHaveTextContent(
        "Service temporarily unavailable",
      );
    },
  );

  it(
    "ignores a health response that arrives after the component unmounts",
    async () => {
      const deferred =
        createDeferred<ApiHealthResponse>();

      mockedGetApiHealth.mockReturnValue(
        deferred.promise,
      );

      const { unmount } =
        renderLandingPage();

      unmount();

      await act(async () => {
        deferred.resolve({
          status: "healthy",
          service: "api",
        });

        await deferred.promise;
      });

      expect(
        mockedGetApiHealth,
      ).toHaveBeenCalledTimes(1);
    },
  );
});
