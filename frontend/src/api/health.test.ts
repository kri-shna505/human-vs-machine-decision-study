import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getApiHealth } from "./health";

function createHealthResponse(
  options: {
    ok?: boolean;
    status?: number;
    body?: unknown;
  } = {},
): Response {
  const {
    ok = true,
    status = 200,
    body = {
      status: "ok",
      service: "decision-study-api",
    },
  } = options;

  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("getApiHealth", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(
    "requests the health endpoint and returns its JSON response",
    async () => {
      const body = {
        status: "ok",
        service: "decision-study-api",
      };

      fetchMock.mockResolvedValue(
        createHealthResponse({
          body,
        }),
      );

      await expect(
        getApiHealth(),
      ).resolves.toEqual(body);

      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/health",
      );
    },
  );

  it(
    "throws when the health endpoint returns a non-success status",
    async () => {
      fetchMock.mockResolvedValue(
        createHealthResponse({
          ok: false,
          status: 503,
        }),
      );

      await expect(
        getApiHealth(),
      ).rejects.toThrow(
        "Health request failed with status 503",
      );
    },
  );

  it(
    "propagates network errors",
    async () => {
      const networkError = new TypeError(
        "Failed to fetch",
      );

      fetchMock.mockRejectedValue(networkError);

      await expect(
        getApiHealth(),
      ).rejects.toBe(networkError);
    },
  );
});
