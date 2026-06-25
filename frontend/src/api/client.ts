const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ??
  "http://127.0.0.1:8000";

interface ApiErrorBody {
  detail?: unknown;
  message?: unknown;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);

    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

function extractErrorMessage(body: unknown, fallbackMessage: string): string {
  if (typeof body !== "object" || body === null) {
    return fallbackMessage;
  }

  const errorBody = body as ApiErrorBody;

  if (
    typeof errorBody.detail === "string" &&
    errorBody.detail.trim().length > 0
  ) {
    return errorBody.detail;
  }

  if (
    typeof errorBody.message === "string" &&
    errorBody.message.trim().length > 0
  ) {
    return errorBody.message;
  }

  return fallbackMessage;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return text.length > 0 ? text : null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
      ...options,
      headers,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "The API could not be reached. Confirm that the backend is running.",
      {cause:error}
    );
  }

  const body = await readResponseBody(response);

  if (!response.ok) {
    const message = extractErrorMessage(
      body,
      `The request failed with status ${response.status}.`,
    );

    throw new ApiRequestError(message, response.status, body);
  }

  return body as T;
}
