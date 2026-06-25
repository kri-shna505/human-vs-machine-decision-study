import type { Page, Route } from "@playwright/test";

const API_BASE_URL = "http://127.0.0.1:8000";
const NOW = "2026-01-01T00:00:00.000Z";

export const STUDY_STORAGE_KEY =
  "decision-study.session.v1";

export interface MockScenarioOption {
  id: string;
  scenario_id: string;
  code: string;
  label: string;
  display_order: number;
}

export interface MockScenario {
  id: string;
  slug: string;
  version: number;
  title: string;
  category: string;
  prompt: string;
  is_active: boolean;
  options: MockScenarioOption[];
}

export interface MockHumanResponse {
  id: string;
  session_id: string;
  scenario_id: string;
  selected_option_id: string;
  confidence: number;
  response_time_ms: number;
  answered_at: string;
}

export interface StoredProgressFixture {
  version: 1;
  participantId: string;
  sessionId: string;
  phase:
    | "landing"
    | "consent"
    | "starting"
    | "question"
    | "submitting"
    | "completing"
    | "completed"
    | "error";
  currentScenarioIndex: number;
  submittedScenarioIds: string[];
}

export interface StudyApiOptions {
  participantError?: string;
  scenariosError?: string;
  sessionError?: string;
  responseError?: string;
  completionError?: string;
}

export interface StudyApiController {
  readonly responses: MockHumanResponse[];
  readonly completed: boolean;
}

export const participant = {
  id: "participant-001",
  participant_code: "P-TEST-001",
  consented_at: NOW,
  created_at: NOW,
};

export const session = {
  id: "session-001",
  participant_id: participant.id,
  randomization_seed: 12345,
  status: "started" as const,
  started_at: NOW,
  completed_at: null,
};

function buildOptions(
  scenarioId: string,
  labels: [string, string],
): MockScenarioOption[] {
  return [
    {
      id: `${scenarioId}-option-a`,
      scenario_id: scenarioId,
      code: "A",
      label: labels[0],
      display_order: 1,
    },
    {
      id: `${scenarioId}-option-b`,
      scenario_id: scenarioId,
      code: "B",
      label: labels[1],
      display_order: 2,
    },
  ];
}

export const scenarios: MockScenario[] = [
  {
    id: "scenario-001",
    slug: "conjunction-test",
    version: 1,
    title: "Library volunteer",
    category: "Probability estimation",
    prompt:
      "Which description is more likely for the person in this scenario?",
    is_active: true,
    options: buildOptions("scenario-001", [
      "The person works at a bank.",
      "The person works at a bank and volunteers at a library.",
    ]),
  },
  {
    id: "scenario-002",
    slug: "framing-test",
    version: 1,
    title: "Treatment decision",
    category: "Contextual bias",
    prompt:
      "Which treatment option would you choose based on the information shown?",
    is_active: true,
    options: buildOptions("scenario-002", [
      "Choose treatment A.",
      "Choose treatment B.",
    ]),
  },
  {
    id: "scenario-003",
    slug: "risk-test",
    version: 1,
    title: "Investment choice",
    category: "Expected value",
    prompt:
      "Which investment option would you choose?",
    is_active: true,
    options: buildOptions("scenario-003", [
      "Choose the guaranteed return.",
      "Choose the uncertain higher return.",
    ]),
  },
];

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "accept, content-type",
  "access-control-allow-methods":
    "GET, POST, OPTIONS",
};

async function fulfillJson(
  route: Route,
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function fulfillError(
  route: Route,
  message: string,
): Promise<void> {
  await fulfillJson(route, 503, {
    detail: message,
  });
}

export async function installStudyApi(
  page: Page,
  options: StudyApiOptions = {},
): Promise<StudyApiController> {
  const responses: MockHumanResponse[] = [];
  let completed = false;

  await page.route(
    `${API_BASE_URL}/health`,
    async (route) => {
      await fulfillJson(route, 200, {
        status: "healthy",
        service: "api",
      });
    },
  );

  await page.route(
    `${API_BASE_URL}/api/v1/**`,
    async (route) => {
      const request = route.request();
      const method = request.method();
      const path = new URL(request.url()).pathname;

      if (method === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
        return;
      }

      if (
        method === "POST" &&
        path === "/api/v1/participants"
      ) {
        if (options.participantError) {
          await fulfillError(
            route,
            options.participantError,
          );
          return;
        }

        await fulfillJson(route, 201, participant);
        return;
      }

      if (
        method === "POST" &&
        path === "/api/v1/sessions"
      ) {
        await fulfillJson(route, 201, session);
        return;
      }

      if (
        method === "GET" &&
        path === "/api/v1/scenarios"
      ) {
        if (options.scenariosError) {
          await fulfillError(
            route,
            options.scenariosError,
          );
          return;
        }

        await fulfillJson(route, 200, scenarios);
        return;
      }

      if (
        method === "GET" &&
        path === `/api/v1/sessions/${session.id}`
      ) {
        if (options.sessionError) {
          await fulfillError(
            route,
            options.sessionError,
          );
          return;
        }

        await fulfillJson(route, 200, {
          ...session,
          status: completed
            ? "completed"
            : "started",
          completed_at: completed ? NOW : null,
          responses,
        });
        return;
      }

      if (
        method === "POST" &&
        path ===
          `/api/v1/sessions/${session.id}/responses`
      ) {
        if (options.responseError) {
          await fulfillError(
            route,
            options.responseError,
          );
          return;
        }

        const payload = request.postDataJSON() as {
          scenario_id: string;
          selected_option_id: string;
          confidence: number;
          response_time_ms: number;
        };

        const response: MockHumanResponse = {
          id: `response-${responses.length + 1}`,
          session_id: session.id,
          scenario_id: payload.scenario_id,
          selected_option_id:
            payload.selected_option_id,
          confidence: payload.confidence,
          response_time_ms:
            payload.response_time_ms,
          answered_at: NOW,
        };

        responses.push(response);

        await fulfillJson(route, 201, response);
        return;
      }

      if (
        method === "POST" &&
        path ===
          `/api/v1/sessions/${session.id}/complete`
      ) {
        if (options.completionError) {
          await fulfillError(
            route,
            options.completionError,
          );
          return;
        }

        completed = true;

        await fulfillJson(route, 200, {
          ...session,
          status: "completed",
          completed_at: NOW,
          response_count: responses.length,
        });
        return;
      }

      await fulfillJson(route, 404, {
        detail: `Unhandled mock request: ${method} ${path}`,
      });
    },
  );

  return {
    responses,
    get completed() {
      return completed;
    },
  };
}

export async function seedStoredProgress(
  page: Page,
  progress: StoredProgressFixture,
): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify(value),
      );
    },
    {
      key: STUDY_STORAGE_KEY,
      value: progress,
    },
  );
}
