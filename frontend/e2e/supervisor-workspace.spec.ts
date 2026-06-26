import {
  expect,
  test,
} from "@playwright/test";

test("supervisor workspace initializes without API traffic", async ({
  page,
}) => {
  const apiRequests: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());

    if (url.pathname.startsWith("/api/")) {
      apiRequests.push(url.pathname);
    }
  });

  await page.goto("/supervisor");

  await expect(
    page.getByRole("heading", {
      name: /explore the study without affecting participant data/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", {
    name: /start supervisor session/i,
  }).click();

  await expect(
    page.getByRole("heading", {
      name: /supervisor workspace is ready/i,
    }),
  ).toBeVisible();

  expect(apiRequests).toEqual([]);
});

test("supervisor workspace can be reset in the same tab", async ({
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
