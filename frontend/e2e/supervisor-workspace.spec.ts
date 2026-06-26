import {
  expect,
  test,
} from "@playwright/test";

async function startGuidedQuestions(
  page: import("@playwright/test").Page,
) {
  await page.goto("/supervisor");

  await page.getByRole("button", {
    name: /start supervisor session/i,
  }).click();

  await page.getByRole("button", {
    name: /begin guided questions/i,
  }).click();
}

test("supervisor questions complete without API traffic", async ({
  page,
}) => {
  const apiRequests: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());

    if (url.pathname.startsWith("/api/")) {
      apiRequests.push(url.pathname);
    }
  });

  await startGuidedQuestions(page);

  await page.getByLabel("Linda is a bank teller.").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page
    .getByLabel("Program A: 200 people will be saved.")
    .check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Receive $500 with certainty.").check();
  await page.getByRole("button", {
    name: /finish experience/i,
  }).click();

  await expect(
    page.getByRole("heading", {
      name: /your responses are ready for review/i,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Receive $500 with certainty."),
  ).toBeVisible();

  expect(apiRequests).toEqual([]);
});

test("supervisor questions recover after refresh", async ({
  page,
}) => {
  await startGuidedQuestions(page);

  await page.getByLabel("Linda is a bank teller.").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(
    page.getByRole("heading", { name: "Framing Effect" }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Framing Effect" }),
  ).toBeVisible();

  await expect(
    page.getByText("Question 2 of 3"),
  ).toBeVisible();
});

test("supervisor session can be reset", async ({
  page,
}) => {
  await page.goto("/supervisor");

  await page.getByRole("button", {
    name: /start supervisor session/i,
  }).click();

  await page.getByRole("button", {
    name: /reset session/i,
  }).click();

  await expect(
    page.getByRole("button", {
      name: /start supervisor session/i,
    }),
  ).toBeVisible();
});
