const { test, expect } = require("@playwright/test");

test("request page direct URL shows localized empty state without POST", async ({ page }) => {
  const nonGet = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) {
      nonGet.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/en/request");
  await expect(page.getByRole("heading", { name: "Choose a boat first" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose a boat" })).toHaveAttribute("href", "/en/boats");

  await page.goto("/ru/request");
  await expect(page.getByRole("heading", { name: "Сначала выберите лодку" })).toBeVisible();

  await page.goto("/me/request");
  await expect(page.getByRole("heading", { name: "Prvo izaberite plovilo" })).toBeVisible();

  expect(nonGet).toEqual([]);
});

test("request page valid boat context renders form without POST on load", async ({ page }) => {
  const nonGet = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) {
      nonGet.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/en/request?slug=test-boat&title=Test%20Boat&pph=100");

  await expect(page.getByRole("heading", { name: "Booking request" })).toBeVisible();
  await expect(page.getByText("Test Boat").first()).toBeVisible();
  await expect(page.locator("form.request-form")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to booking" })).toBeDisabled();
  expect(nonGet).toEqual([]);
});
