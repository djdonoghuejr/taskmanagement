import { test, expect } from "@playwright/test";

const seedTaskName = `Playwright Task ${Date.now()}`;

function taskRowLocator(page, name: string) {
  return page.locator(`text=${name}`).first();
}

test("create, update, duplicate, delete tasks", async ({ page }) => {
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

  await page.getByRole("button", { name: "Add Task" }).click();
  await page.getByPlaceholder("Task name").fill(seedTaskName);
  await page.locator('input[type="date"]').first().fill("2026-04-01");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(taskRowLocator(page, seedTaskName)).toBeVisible();

  // Open details
  const firstRow = page.locator(`[data-testid^="task-row-"]`).filter({ hasText: seedTaskName }).first();
  const rowId = await firstRow.getAttribute("data-testid");
  const taskId = rowId?.replace("task-row-", "");
  if (!taskId) throw new Error("Task row id not found");

  await firstRow.locator("button").first().click();
  await page.getByPlaceholder("Task name").fill(`${seedTaskName} Updated`);
  await page.getByPlaceholder("What is this about?").fill("Updated via Playwright");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(taskRowLocator(page, `${seedTaskName} Updated`)).toBeVisible();

  // Duplicate
  await page.getByTestId(`task-duplicate-${taskId}`).click();
  await expect(page.locator(`text=${seedTaskName} Updated`)).toHaveCount(2);

  // Delete one instance
  const firstDelete = page.getByTestId(`task-delete-${taskId}`);
  await firstDelete.click();
  await expect(page.locator(`text=${seedTaskName} Updated`)).toHaveCount(1);
});
