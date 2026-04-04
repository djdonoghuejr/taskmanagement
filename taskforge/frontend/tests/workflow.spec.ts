import { test, expect, type Page } from "@playwright/test";

async function browserIsoToday(page: Page) {
  return page.evaluate(() => new Date().toISOString().slice(0, 10));
}

async function failOnViteOverlay(page: Page) {
  const overlay = page.locator("vite-error-overlay");
  if ((await overlay.count()) > 0) {
    const msg = (await overlay.innerText()).slice(0, 2000);
    throw new Error(`Vite error overlay detected:\n${msg}`);
  }
}

function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

test("today -> history: task completion with notes + reopen", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.stack || err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const name = `PW Today Task ${Date.now()}`;
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

  const today = await browserIsoToday(page);

  await page.getByRole("button", { name: "Add Task" }).click();
  await page.getByPlaceholder("Task name").fill(name);
  await page.locator('input[type="date"]').first().fill(today);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(name).first()).toBeVisible();

  await page.goto("/?view=today");
  await failOnViteOverlay(page);
  if (consoleErrors.length) {
    throw new Error(`Browser console errors:\n${consoleErrors.slice(0, 10).join("\n")}`);
  }
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Due Today" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });

  await page.getByText(name).first().click();
  await page.getByPlaceholder("What happened?").fill("Did it via Playwright");
  await page.getByRole("button", { name: "Complete" }).click();
  await page.getByRole("button", { name: "Close" }).click();

  await page.goto("/?view=history");
  await failOnViteOverlay(page);
  if (consoleErrors.length) {
    throw new Error(`Browser console errors:\n${consoleErrors.slice(0, 10).join("\n")}`);
  }
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Did it via Playwright").first()).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Reopen" }).first().click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("today -> history: habit completion with notes + edit + undo", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.stack || err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const name = `PW Daily ${Date.now()}`;

  await page.goto("/habits");
  await expect(page.getByRole("heading", { name: "Habits" })).toBeVisible();

  await page.getByRole("button", { name: "Add Habit" }).click();
  await page.getByPlaceholder("Habit name").fill(name);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(name).first()).toBeVisible();

  await page.goto("/?view=today");
  await failOnViteOverlay(page);
  if (consoleErrors.length) {
    throw new Error(`Browser console errors:\n${consoleErrors.slice(0, 10).join("\n")}`);
  }
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Due Today" })).toBeVisible({ timeout: 15000 });

  await page.getByText(name).first().click();
  await page.getByPlaceholder("How did it go?").fill("Recurring done");
  await page.getByRole("button", { name: "Complete Today" }).click();
  await page.getByRole("button", { name: "Close" }).click();

  await page.goto("/?view=history");
  await failOnViteOverlay(page);
  if (consoleErrors.length) {
    throw new Error(`Browser console errors:\n${consoleErrors.slice(0, 10).join("\n")}`);
  }
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Recurring done").first()).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Edit notes" }).first().click();
  await page.locator("textarea").last().fill("Recurring updated");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Recurring updated").first()).toBeVisible();

  const habitCard = page
    .locator("div.rounded-xl")
    .filter({ hasText: name })
    .filter({ hasText: "Habit completion" })
    .first();
  await habitCard.getByRole("button", { name: "Undo" }).first().click();
  await expect(
    page.locator("div.rounded-xl").filter({ hasText: name }).filter({ hasText: "Habit completion" })
  ).toHaveCount(0);
});

test("upcoming: rescheduling moves task out of window", async ({ page }) => {
  const name = `PW Upcoming ${Date.now()}`;
  const dueSoon = isoDaysFromNow(3);

  await page.goto("/tasks");
  await page.getByRole("button", { name: "Add Task" }).click();
  await page.getByPlaceholder("Task name").fill(name);
  await page.locator('input[type="date"]').first().fill(dueSoon);
  await page.getByRole("button", { name: "Save" }).click();

  await page.goto("/?view=upcoming");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible();

  // Move it far out so it should disappear from 7-day window
  const card = page
    .getByText(name)
    .first()
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
    .first();
  await card.locator('input[type="date"]').fill(isoDaysFromNow(45));
  await expect(page.getByText(name)).toHaveCount(0);
});
