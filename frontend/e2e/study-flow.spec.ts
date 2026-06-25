import {
  expect,
  type Page,
  test,
} from "@playwright/test";

import {
  installStudyApi,
  participant,
  scenarios,
  seedStoredProgress,
  session,
  STUDY_STORAGE_KEY,
} from "./fixtures/studyApi";

async function startStudy(page: Page): Promise<void> {
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
  confidence = "80",
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

test.describe("participant study journey", () => {
  test(
    "completes consent, all questions, and completion",
    async ({ page }) => {
      const api = await installStudyApi(page);

      await startStudy(page);

      await expect(
        page.getByText("Question 1 of 3"),
      ).toBeVisible();
      await answerCurrentQuestion(page);

      await expect(
        page.getByRole("heading", {
          name: scenarios[1].title,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Question 2 of 3"),
      ).toBeVisible();
      await answerCurrentQuestion(page, "75");

      await expect(
        page.getByRole("heading", {
          name: scenarios[2].title,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Question 3 of 3"),
      ).toBeVisible();
      await answerCurrentQuestion(page, "90");

      await expect(page).toHaveURL(/\/complete$/);
      await expect(
        page.getByRole("heading", {
          name: "Thank you for participating",
        }),
      ).toBeVisible();
      await expect(
        page.getByText(session.id),
      ).toBeVisible();

      expect(api.responses).toHaveLength(3);
      expect(api.completed).toBe(true);

      await page
        .getByRole("link", {
          name: "Return to home",
        })
        .click();

      await expect(page).toHaveURL(/\/$/);

      const storedProgress =
        await page.evaluate((key) => {
          return window.localStorage.getItem(key);
        }, STUDY_STORAGE_KEY);

      expect(storedProgress).toBeNull();
    },
  );

  test(
    "recovers the next unanswered question after refresh",
    async ({ page }) => {
      const api = await installStudyApi(page);

      await startStudy(page);
      await answerCurrentQuestion(page);

      await expect(
        page.getByRole("heading", {
          name: scenarios[1].title,
        }),
      ).toBeVisible();

      await page.reload();

      await expect(
        page.getByRole("heading", {
          name: scenarios[1].title,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Question 2 of 3"),
      ).toBeVisible();

      expect(api.responses).toHaveLength(1);

      const storedProgress =
        await page.evaluate((key) => {
          const raw =
            window.localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        }, STUDY_STORAGE_KEY);

      expect(
        storedProgress.submittedScenarioIds,
      ).toEqual([scenarios[0].id]);
    },
  );
});

test.describe("route protection", () => {
  test(
    "redirects uninitialized protected routes",
    async ({ page }) => {
      await installStudyApi(page);

      await page.goto("/study");
      await expect(page).toHaveURL(/\/consent$/);
      await expect(
        page.getByRole("heading", {
          name: "Before you begin",
        }),
      ).toBeVisible();

      await page.goto("/complete");
      await expect(page).toHaveURL(/\/consent$/);

      await page.goto("/not-a-real-route");
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("heading", {
          name: /Human vs Machine/,
        }),
      ).toBeVisible();
    },
  );

  test(
    "redirects a completed study session to completion",
    async ({ page }) => {
      await installStudyApi(page);

      await seedStoredProgress(page, {
        version: 1,
        participantId: participant.id,
        sessionId: session.id,
        phase: "completed",
        currentScenarioIndex:
          scenarios.length,
        submittedScenarioIds:
          scenarios.map(
            (scenario) => scenario.id,
          ),
      });

      await page.goto("/study");

      await expect(page).toHaveURL(/\/complete$/);
      await expect(
        page.getByText(session.id),
      ).toBeVisible();
    },
  );
});

test.describe("API failure handling", () => {
  test(
    "shows a recoverable error when participant creation fails",
    async ({ page }) => {
      await installStudyApi(page, {
        participantError:
          "Participant registration is temporarily unavailable.",
      });

      await page.goto("/consent");
      await page
        .getByRole("checkbox")
        .check();
      await page
        .getByRole("button", {
          name: "Consent and continue",
        })
        .click();

      await expect(page).toHaveURL(/\/consent$/);
      await expect(
        page.getByRole("alert"),
      ).toHaveText(
        "Participant registration is temporarily unavailable.",
      );
      await expect(
        page.getByRole("button", {
          name: "Consent and continue",
        }),
      ).toBeEnabled();
    },
  );

  test(
    "shows the study load error screen when scenarios fail",
    async ({ page }) => {
      await installStudyApi(page, {
        scenariosError:
          "Study scenarios are temporarily unavailable.",
      });

      await seedStoredProgress(page, {
        version: 1,
        participantId: participant.id,
        sessionId: session.id,
        phase: "question",
        currentScenarioIndex: 0,
        submittedScenarioIds: [],
      });

      await page.goto("/study");

      await expect(
        page.getByRole("heading", {
          name: "Unable to load the study",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("alert"),
      ).toHaveText(
        "Study scenarios are temporarily unavailable.",
      );
      await expect(
        page.getByRole("button", {
          name: "Try again",
        }),
      ).toBeVisible();
    },
  );

  test(
    "keeps the participant on the question after response failure",
    async ({ page }) => {
      const api = await installStudyApi(page, {
        responseError:
          "The response could not be recorded.",
      });

      await startStudy(page);
      await answerCurrentQuestion(page);

      await expect(page).toHaveURL(/\/study$/);
      await expect(
        page.getByRole("heading", {
          name: scenarios[0].title,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("alert"),
      ).toHaveText(
        "The response could not be recorded.",
      );

      expect(api.responses).toHaveLength(0);
      expect(api.completed).toBe(false);
    },
  );
});
