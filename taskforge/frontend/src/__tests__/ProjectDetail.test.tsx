import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProjectDetail from "../pages/ProjectDetail";
import { Project, Task, TaskDependencies } from "../types";

let projectsStore: Project[] = [];
let tasksStore: Task[] = [];
let dependencyStore: Record<string, TaskDependencies> = {};

const mockListProjects = vi.fn(async () => projectsStore);
const mockListTasks = vi.fn(async () => tasksStore);
const mockGetTaskDependencies = vi.fn(async (id: string) => dependencyStore[id] || { blocked_by: [], blocking: [] });

vi.mock("../api/projects", () => ({
  listProjects: () => mockListProjects(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock("../api/tasks", () => ({
  listTasks: () => mockListTasks(),
  getTaskDependencies: (id: string) => mockGetTaskDependencies(id),
}));

vi.mock("../components/TaskDialog", () => ({
  default: ({ open, task }: { open: boolean; task: Task | null }) =>
    open ? <div data-testid="task-dialog-open">{task?.name}</div> : null,
}));

vi.mock("../components/ProjectDialog", () => ({
  default: () => null,
}));

function renderProjectPage(initialPath: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  projectsStore = [
    {
      id: "project-1",
      user_id: "00000000-0000-0000-0000-000000000001",
      name: "Launch",
      color: "#1d6b62",
      description: "Launch work",
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  tasksStore = [
    {
      id: "task-overdue",
      user_id: "00000000-0000-0000-0000-000000000001",
      project_id: "project-1",
      name: "Fix checklist",
      description: null,
      can_be_done_virtually: true,
      start_date: "2026-03-30",
      due_date: "2026-04-01",
      expected_minutes: 15,
      tags: [],
      status: "pending",
      completed_at: null,
      completion_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "task-unscheduled",
      user_id: "00000000-0000-0000-0000-000000000001",
      project_id: "project-1",
      name: "Draft summary",
      description: null,
      can_be_done_virtually: false,
      start_date: null,
      due_date: null,
      expected_minutes: null,
      tags: [],
      status: "blocked",
      completed_at: null,
      completion_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "task-completed",
      user_id: "00000000-0000-0000-0000-000000000001",
      project_id: "project-1",
      name: "Ship checklist",
      description: null,
      can_be_done_virtually: true,
      start_date: "2026-03-28",
      due_date: "2026-03-29",
      expected_minutes: 45,
      tags: [],
      status: "completed",
      completed_at: new Date().toISOString(),
      completion_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "task-other-project",
      user_id: "00000000-0000-0000-0000-000000000001",
      project_id: "project-2",
      name: "Ignore me",
      description: null,
      can_be_done_virtually: false,
      start_date: "2026-04-03",
      due_date: "2026-04-05",
      expected_minutes: 30,
      tags: [],
      status: "pending",
      completed_at: null,
      completion_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  mockListProjects.mockClear();
  mockListTasks.mockClear();
  mockGetTaskDependencies.mockClear();
  dependencyStore = {
    "task-overdue": { blocked_by: [], blocking: [{ id: "task-unscheduled", name: "Draft summary", status: "pending", start_date: null, due_date: null, project_id: "project-1" }] },
    "task-unscheduled": { blocked_by: [{ id: "task-overdue", name: "Fix checklist", status: "pending", start_date: "2026-03-30", due_date: "2026-04-01", project_id: "project-1" }], blocking: [] },
  };
});

describe("ProjectDetail", () => {
  it("defaults to timeline and shows project tasks there", async () => {
    renderProjectPage("/projects/project-1");

    expect(await screen.findByText("Launch")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Timeline" })).toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getAllByText("Fix checklist").length).toBeGreaterThan(0);
    expect(screen.getByText("Draft summary")).toBeInTheDocument();
    expect(screen.queryByText("Ignore me")).not.toBeInTheDocument();
  });

  it("switches to dependency and list views", async () => {
    renderProjectPage("/projects/project-1");

    fireEvent.click(await screen.findByRole("tab", { name: "Dependencies" }));
    expect(await screen.findByRole("heading", { name: "Blocked" })).toBeInTheDocument();
    expect(screen.getByText("Blocked by Fix checklist")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "List" }));
    expect(await screen.findByRole("heading", { name: "Overdue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completed" })).toBeInTheDocument();
  });

  it("opens task dialog from project workspace content", async () => {
    renderProjectPage("/projects/project-1");

    const timelineGrid = await screen.findByText("Roadmap");
    const timelineSection = timelineGrid.closest("section");
    expect(timelineSection).not.toBeNull();
    fireEvent.click(within(timelineSection as HTMLElement).getAllByText("Fix checklist")[0]);

    expect(screen.getByTestId("task-dialog-open")).toHaveTextContent("Fix checklist");
  });
});
