// Read the API URL from Vite's environment configuration.
// Use localhost as a development fallback.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

// Describe the expected JSON returned by GET /health.
export interface ApiHealthResponse {
  status: string;
  service: string;
}

// Call the FastAPI health endpoint.
export async function getApiHealth(): Promise<ApiHealthResponse> {
  // Send the HTTP request.
  const response = await fetch(`${API_BASE_URL}/health`);

  // Reject unsuccessful HTTP responses.
  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  // Parse and return the JSON response.
  return response.json() as Promise<ApiHealthResponse>;
}