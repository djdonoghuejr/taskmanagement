import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProjectDetail from "../pages/ProjectDetail";
import { Project, Task } from "../types";

let projectsStore: Project[] = [];
let tasksStore: Task[] = [];

const mockListProjects = vi.fn(async () => projectsStore);
const mockListTasks = vi.fn(async () => tasksStore);

vi.mock("../api/projects", () => ({
  listProjects: () => mockListProjects(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock("../api/tasks", () => ({
  listTasks: () => mockListTasks(),
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
      due_date: null,
      expected_minutes: null,
      tags: [],
      status: "pending",
      completed_at: null,
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
});

describe("ProjectDetail", () => {
  it("shows only project tasks in grouped sections", async () => {
    renderProjectPage("/projects/project-1");

    expect(await screen.findByText("Launch")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Unscheduled")).toBeInTheDocument();
    expect(screen.getByText("Fix checklist")).toBeInTheDocument();
    expect(screen.getByText("Draft summary")).toBeInTheDocument();
    expect(screen.queryByText("Ignore me")).not.toBeInTheDocument();
  });

  it("opens task dialog from project timeline cards", async () => {
    renderProjectPage("/projects/project-1");

    fireEvent.click(await screen.findByText("Fix checklist"));

    expect(screen.getByTestId("task-dialog-open")).toHaveTextContent("Fix checklist");
  });
});
