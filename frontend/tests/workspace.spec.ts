import { test, expect } from "@playwright/test";

test("create people, projects, and tasks; edit, filter, delete; mobile layout", async ({
  page,
}) => {
  const userId = "c0d4952d-9fe5-4659-9694-72979113f747";
  const projectId = "7b7632f8-1229-4cba-85d1-1877af6be99b";
  const taskId = "039c4135-b8a1-42ee-83b0-a546caf90d17";
  const users: Record<string, unknown>[] = [];
  const projects: Record<string, unknown>[] = [];
  let tasks: Record<string, unknown>[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const name = url.pathname.split("/")[2];
    const id = url.pathname.split("/")[3];
    const rows =
      name === "users" ? users : name === "projects" ? projects : tasks;
    if (request.method() === "GET") {
      const result =
        name === "tasks"
          ? tasks.filter(
              (task) =>
                task.projectId === url.searchParams.get("projectId") &&
                (!url.searchParams.get("status") ||
                  task.status === url.searchParams.get("status")),
            )
          : rows;
      return route.fulfill({ json: result });
    }
    if (request.method() === "POST") {
      const record = {
        id:
          name === "users" ? userId : name === "projects" ? projectId : taskId,
        status: "todo",
        ...request.postDataJSON(),
      };
      rows.push(record);
      return route.fulfill({ status: 201, json: record });
    }
    if (request.method() === "PATCH") {
      const task = tasks.find((task) => task.id === id)!;
      Object.assign(task, request.postDataJSON());
      return route.fulfill({ json: task });
    }
    tasks = tasks.filter((task) => task.id !== id);
    return route.fulfill({ status: 204 });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Add your first person" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Rannie");
  await page.getByLabel("Email", { exact: true }).fill("rannie@example.com");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add person", exact: true })
    .click();
  await page.getByRole("button", { name: "Create your first project" }).click();
  await page.getByLabel("Name", { exact: true }).fill("TaskFlow launch");
  await page
    .getByLabel("Description")
    .fill("A focused workspace for the next release.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "TaskFlow launch" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "+ Add task", exact: true })
    .first()
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Finish the MVP");
  await page.getByLabel("Description").fill("Verify the full local workflow.");
  await page.getByRole("combobox", { name: "Assignee", exact: true }).selectOption(userId);
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Finish the MVP Verify/ }),
  ).toBeVisible();
  await page
    .getByLabel("Status for Finish the MVP")
    .selectOption("in_progress");
  await expect(page.getByLabel("Status for Finish the MVP")).toHaveValue(
    "in_progress",
  );
  await page.getByRole("button", { name: /Finish the MVP Verify/ }).click();
  await page.getByLabel("Title", { exact: true }).fill("Ship the local MVP");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("button", { name: /Ship the local MVP Verify/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No tasks with this status." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All tasks", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Ship the local MVP Verify/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: /Ship the local MVP Verify/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/workspace-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Delete Ship the local MVP", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep task" }).click();
  await expect(
    page.getByRole("button", { name: /Ship the local MVP Verify/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Ship the local MVP", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your next step starts here." }),
  ).toBeVisible();
});

test("API failures are visible and can be retried", async ({ page }) => {
  let failed = true;
  await page.route("**/api/**", (route) =>
    route.fulfill(
      failed
        ? {
            status: 502,
            json: { message: "TaskFlow could not reach the API." },
          }
        : { json: [] },
    ),
  );
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("could not reach");
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add your first person" }),
  ).toBeVisible();
});
