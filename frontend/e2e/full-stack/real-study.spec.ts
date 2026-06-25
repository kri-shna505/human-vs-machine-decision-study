import {
  expect,
  type APIRequestContext,
  type Page,
  test,
} from "@playwright/test";

const API_BASE_URL = "http://127.0.0.1:8000";

interface Scenario {
  id: string;
  title: string;
  options: Array<{
    id: string;
    label: string;
  }>;
}

interface SessionDetail {
  id: string;
  status: string;
  completed_at: string | null;
  responses: Array<{
    id: string;
    scenario_id: string;
    selected_option_id: string;
    confidence: number;
  }>;
}

async function loadScenarios(
  request: APIRequestContext,
): Promise<Scenario[]> {
  const response = await request.get(
    `${API_BASE_URL}/api/v1/scenarios`,
  );

  expect(response.ok()).toBe(true);

  const scenarios =
    (await response.json()) as Scenario[];

  expect(scenarios).toHaveLength(3);

  for (const scenario of scenarios) {
    expect(scenario.options.length).toBeGreaterThan(1);
  }

  return scenarios;
}

async function beginStudy(
  page: Page,
  scenarios: Scenario[],
): Promise<void> {
  await page.goto("/consent");

  await page
    .getByRole("checkbox")
    .check();

  await page
    .getByRole("button", {
      name: "Consent and continue",
    })
    .click();

  await expect(page).toHaveURL(/\/study$/);
  await expect(
    page.getByRole("heading", {
      name: scenarios[0].title,
    }),
  ).toBeVisible();
}

async function answerCurrentQuestion(
  page: Page,
  confidence: string,
): Promise<void> {
  await page
    .getByRole("radio")
    .first()
    .check();

  await page
    .getByLabel("Confidence in your answer")
    .fill(confidence);

  await page
    .getByRole("button", {
      name: /Submit/,
    })
    .click();
}

test.describe("real frontend, API, and PostgreSQL integration", () => {
  test(
    "persists a complete participant journey through the real stack",
    async ({ page, request }) => {
      const healthResponse = await request.get(
        `${API_BASE_URL}/health`,
      );

      expect(healthResponse.ok()).toBe(true);

      const scenarios = await loadScenarios(request);

      await beginStudy(page, scenarios);

      for (
        let index = 0;
        index < scenarios.length;
        index += 1
      ) {
        const scenario = scenarios[index];

        await expect(
          page.getByText(
            `Question ${index + 1} of ${scenarios.length}`,
          ),
        ).toBeVisible();

        await expect(
          page.getByRole("heading", {
            name: scenario.title,
          }),
        ).toBeVisible();

        await answerCurrentQuestion(
          page,
          String(70 + index * 10),
        );
      }

      await expect(page).toHaveURL(/\/complete$/);
      await expect(
        page.getByRole("heading", {
          name: "Thank you for participating",
        }),
      ).toBeVisible();

      const sessionReference = (
        await page
          .locator(".completion-reference strong")
          .innerText()
      ).trim();

      expect(sessionReference).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      const sessionResponse = await request.get(
        `${API_BASE_URL}/api/v1/sessions/${sessionReference}`,
      );

      expect(sessionResponse.ok()).toBe(true);

      const session =
        (await sessionResponse.json()) as SessionDetail;

      expect(session.id).toBe(sessionReference);
      expect(session.status).toBe("completed");
      expect(session.completed_at).not.toBeNull();
      expect(session.responses).toHaveLength(
        scenarios.length,
      );

      expect(
        new Set(
          session.responses.map(
            (response) => response.scenario_id,
          ),
        ).size,
      ).toBe(scenarios.length);

      expect(
        session.responses.every(
          (response) =>
            response.confidence >= 0 &&
            response.confidence <= 100,
        ),
      ).toBe(true);
    },
  );

  test(
    "restores progress from PostgreSQL after a browser refresh",
    async ({ page, request }) => {
      const scenarios = await loadScenarios(request);

      await beginStudy(page, scenarios);
      await answerCurrentQuestion(page, "85");

      await expect(
        page.getByRole("heading", {
          name: scenarios[1].title,
        }),
      ).toBeVisible();

      await page.reload();

      await expect(page).toHaveURL(/\/study$/);
      await expect(
        page.getByText(
          `Question 2 of ${scenarios.length}`,
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: scenarios[1].title,
        }),
      ).toBeVisible();

      const storedProgress = await page.evaluate(() => {
        const raw = window.localStorage.getItem(
          "decision-study.session.v1",
        );

        return raw
          ? (JSON.parse(raw) as {
              sessionId: string;
              submittedScenarioIds: string[];
            })
          : null;
      });

      expect(storedProgress).not.toBeNull();
      expect(
        storedProgress?.submittedScenarioIds,
      ).toEqual([scenarios[0].id]);

      const sessionResponse = await request.get(
        `${API_BASE_URL}/api/v1/sessions/${storedProgress?.sessionId}`,
      );

      expect(sessionResponse.ok()).toBe(true);

      const session =
        (await sessionResponse.json()) as SessionDetail;

      expect(session.status).toBe("started");
      expect(session.responses).toHaveLength(1);
      expect(session.responses[0].scenario_id).toBe(
        scenarios[0].id,
      );
    },
  );
});
