import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ApiRequestError,
  apiRequest,
} from "./client";

interface MockResponseOptions {
  ok?: boolean;
  status?: number;
  contentType?: string;
  jsonBody?: unknown;
  textBody?: string;
}

function createMockResponse({
  ok = true,
  status = 200,
  contentType = "application/json",
  jsonBody = null,
  textBody = "",
}: MockResponseOptions = {}): Response {
  return {
    ok,
    status,
    headers: new Headers({
      "content-type": contentType,
    }),
    json: vi.fn().mockResolvedValue(jsonBody),
    text: vi.fn().mockResolvedValue(textBody),
  } as unknown as Response;
}

describe("apiRequest", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(
    "normalizes the path, sends JSON headers, and returns a JSON body",
    async () => {
      const responseBody = {
        status: "ok",
      };

      fetchMock.mockResolvedValue(
        createMockResponse({
          jsonBody: responseBody,
        }),
      );

      const result = await apiRequest<
        typeof responseBody
      >("api/example", {
        method: "POST",
        body: JSON.stringify({
          value: 1,
        }),
      });

      expect(result).toEqual(responseBody);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, request] =
        fetchMock.mock.calls[0];
      const headers =
        request?.headers as Headers;

      expect(url).toBe(
        "http://127.0.0.1:8000/api/example",
      );
      expect(request?.method).toBe("POST");
      expect(request?.body).toBe(
        JSON.stringify({
          value: 1,
        }),
      );
      expect(headers.get("Accept")).toBe(
        "application/json",
      );
      expect(
        headers.get("Content-Type"),
      ).toBe("application/json");
    },
  );

  it(
    "preserves custom headers and does not overwrite a custom content type",
    async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          jsonBody: {
            ok: true,
          },
        }),
      );

      await apiRequest("/custom", {
        method: "POST",
        body: "plain text",
        headers: {
          "Content-Type": "text/plain",
          "X-Request-Id": "request-123",
        },
      });

      const request =
        fetchMock.mock.calls[0][1];
      const headers =
        request?.headers as Headers;

      expect(
        headers.get("Content-Type"),
      ).toBe("text/plain");
      expect(
        headers.get("X-Request-Id"),
      ).toBe("request-123");
      expect(headers.get("Accept")).toBe(
        "application/json",
      );
    },
  );

  it(
    "does not add a content type when the request has no body",
    async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          jsonBody: [],
        }),
      );

      await apiRequest("/items", {
        method: "GET",
      });

      const request =
        fetchMock.mock.calls[0][1];
      const headers =
        request?.headers as Headers;

      expect(
        headers.has("Content-Type"),
      ).toBe(false);
    },
  );

  it.each([204, 205])(
    "returns null for a %s response",
    async (status) => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          status,
          contentType: "",
        }),
      );

      await expect(
        apiRequest<null>("/empty"),
      ).resolves.toBeNull();
    },
  );

  it(
    "returns a non-empty text response",
    async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          contentType: "text/plain",
          textBody: "plain response",
        }),
      );

      await expect(
        apiRequest<string>("/text"),
      ).resolves.toBe("plain response");
    },
  );

  it(
    "returns null for an empty text response",
    async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          contentType: "text/plain",
          textBody: "",
        }),
      );

      await expect(
        apiRequest<null>("/empty-text"),
      ).resolves.toBeNull();
    },
  );

  it(
    "throws ApiRequestError using the API detail message",
    async () => {
      const body = {
        detail: "Invalid response payload.",
      };

      fetchMock.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 422,
          jsonBody: body,
        }),
      );

      const request = apiRequest("/failure");

      await expect(request).rejects.toMatchObject({
        name: "ApiRequestError",
        message: "Invalid response payload.",
        status: 422,
        body,
      });

      await expect(request).rejects.toBeInstanceOf(
        ApiRequestError,
      );
    },
  );

  it(
    "uses the message field when detail is unavailable",
    async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 400,
          jsonBody: {
            message: "Bad request.",
          },
        }),
      );

      await expect(
        apiRequest("/failure"),
      ).rejects.toThrow("Bad request.");
    },
  );

  it(
    "uses a status fallback for an unstructured error body",
    async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 503,
          contentType: "text/plain",
          textBody: "Unavailable",
        }),
      );

      await expect(
        apiRequest("/failure"),
      ).rejects.toThrow(
        "The request failed with status 503.",
      );
    },
  );

  it(
    "wraps network failures and preserves the original cause",
    async () => {
      const networkError = new TypeError(
        "fetch failed",
      );

      fetchMock.mockRejectedValue(networkError);

      try {
        await apiRequest("/network");
        throw new Error(
          "Expected apiRequest to reject.",
        );
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({
          message:
            "The API could not be reached. Confirm that the backend is running.",
          cause: networkError,
        });
      }
    },
  );

  it(
    "rethrows AbortError without wrapping it",
    async () => {
      const abortError = new DOMException(
        "The operation was aborted.",
        "AbortError",
      );

      fetchMock.mockRejectedValue(abortError);

      await expect(
        apiRequest("/aborted"),
      ).rejects.toBe(abortError);
    },
  );
});
