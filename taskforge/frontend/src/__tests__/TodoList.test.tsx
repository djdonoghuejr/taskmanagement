import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TodoList from "../pages/TodoList";
import { Project, Task, TaskActivity } from "../types";

let tasksStore: Task[] = [];
let projectsStore: Project[] = [];

const mockListTasks = vi.fn(async () => tasksStore);
const mockCreateTask = vi.fn(async (payload: Partial<Task>) => {
  const task: Task = {
    id: `task-${tasksStore.length + 1}`,
    user_id: "00000000-0000-0000-0000-000000000001",
    name: payload.name || "",
    description: payload.description || null,
    project_id: payload.project_id || null,
    expected_minutes: payload.expected_minutes || null,
    due_date: payload.due_date || null,
    tags: payload.tags || [],
    status: "pending",
    completed_at: null,
    completion_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasksStore = [...tasksStore, task];
  return task;
});

const mockUpdateTask = vi.fn(async (id: string, payload: Partial<Task>) => {
  tasksStore = tasksStore.map((t) =>
    t.id === id ? { ...t, ...payload, updated_at: new Date().toISOString() } : t
  );
  return tasksStore.find((t) => t.id === id)!;
});

const mockDeleteTask = vi.fn(async (id: string) => {
  tasksStore = tasksStore.filter((t) => t.id !== id);
  return { ok: true };
});

const mockDuplicateTask = vi.fn(async (id: string) => {
  const original = tasksStore.find((t) => t.id === id)!;
  const dup: Task = {
    ...original,
    id: `task-${tasksStore.length + 1}`,
    status: "pending",
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasksStore = [...tasksStore, dup];
  return dup;
});

const mockCompleteTask = vi.fn(async (id: string) => {
  tasksStore = tasksStore.map((t) =>
    t.id === id ? { ...t, status: "completed", completed_at: new Date().toISOString() } : t
  );
  return tasksStore.find((t) => t.id === id)!;
});

const mockReopenTask = vi.fn(async (id: string) => {
  tasksStore = tasksStore.map((t) => (t.id === id ? { ...t, status: "pending", completed_at: null } : t));
  return tasksStore.find((t) => t.id === id)!;
});

const mockListTaskActivity = vi.fn(async () => [] as TaskActivity[]);
const mockAddTaskComment = vi.fn(async () => ({} as TaskActivity));
const mockGetTask = vi.fn(async (id: string) => tasksStore.find((t) => t.id === id)!);
const mockGetTaskDependencies = vi.fn(async () => ({ blocked_by: [], blocking: [] }));
const mockSearchTasks = vi.fn(async () => []);
const mockListProjects = vi.fn(async () => projectsStore);

vi.mock("../api/tasks", () => ({
  listTasks: () => mockListTasks(),
  createTask: (payload: Partial<Task>) => mockCreateTask(payload),
  updateTask: (id: string, payload: Partial<Task>) => mockUpdateTask(id, payload),
  deleteTask: (id: string) => mockDeleteTask(id),
  duplicateTask: (id: string) => mockDuplicateTask(id),
  completeTask: (id: string) => mockCompleteTask(id),
  reopenTask: (id: string) => mockReopenTask(id),
  listTaskActivity: () => mockListTaskActivity(),
  addTaskComment: () => mockAddTaskComment(),
  getTask: (id: string) => mockGetTask(id),
  getTaskDependencies: (id: string) => mockGetTaskDependencies(id),
  searchTasks: () => mockSearchTasks(),
}));

vi.mock("../api/projects", () => ({
  listProjects: () => mockListProjects(),
}));

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <TodoList />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  tasksStore = [];
  projectsStore = [
    {
      id: "project-1",
      user_id: "00000000-0000-0000-0000-000000000001",
      name: "Ops",
      color: "#1d6b62",
      description: "Operations",
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  mockListTasks.mockClear();
  mockCreateTask.mockClear();
  mockUpdateTask.mockClear();
  mockDeleteTask.mockClear();
  mockDuplicateTask.mockClear();
  mockCompleteTask.mockClear();
  mockReopenTask.mockClear();
  mockListTaskActivity.mockClear();
  mockAddTaskComment.mockClear();
  mockGetTask.mockClear();
  mockGetTaskDependencies.mockClear();
  mockSearchTasks.mockClear();
  mockListProjects.mockClear();
});

describe("TodoList", () => {
  it("creates a task via modal", async () => {
    renderWithClient();

    fireEvent.click(screen.getByText("Add Task"));
    fireEvent.change(screen.getByPlaceholderText("Task name"), { target: { value: "My Task" } });
    await screen.findByRole("option", { name: "Ops" });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "project-1" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(mockCreateTask).toHaveBeenCalled());
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ project_id: "project-1" }));
    await waitFor(() => expect(screen.getByText("My Task")).toBeInTheDocument());
    expect(screen.getByText("Task created")).toBeInTheDocument();
    expect(screen.getByText("“My Task” is saved and ready when you are.")).toBeInTheDocument();
  });

  it("opens task details and saves changes", async () => {
    tasksStore = [
      {
        id: "task-1",
        user_id: "00000000-0000-0000-0000-000000000001",
        name: "Original",
        description: null,
        project_id: null,
        expected_minutes: null,
        due_date: null,
        tags: [],
        status: "pending",
        completed_at: null,
        completion_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    renderWithClient();

    await waitFor(() => expect(screen.getByText("Original")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Original"));

    fireEvent.change(screen.getByPlaceholderText("Task name"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalled());
  });
});
