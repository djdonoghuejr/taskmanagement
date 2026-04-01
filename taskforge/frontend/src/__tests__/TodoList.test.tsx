import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TodoList from "../pages/TodoList";
import { Task } from "../types";

let tasksStore: Task[] = [];

const mockListTasks = vi.fn(async () => tasksStore);
const mockCreateTask = vi.fn(async (payload: Partial<Task>) => {
  const task: Task = {
    id: `task-${tasksStore.length + 1}`,
    user_id: "00000000-0000-0000-0000-000000000001",
    name: payload.name || "",
    description: payload.description || null,
    project_id: payload.project_id || null,
    due_date: payload.due_date || null,
    tags: payload.tags || [],
    status: "pending",
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasksStore = [...tasksStore, task];
  return task;
});
const mockUpdateTask = vi.fn(async (id: string, payload: Partial<Task>) => {
  tasksStore = tasksStore.map((task) =>
    task.id === id
      ? {
          ...task,
          ...payload,
          updated_at: new Date().toISOString(),
        }
      : task
  );
  return tasksStore.find((task) => task.id === id)!;
});
const mockDeleteTask = vi.fn(async (id: string) => {
  tasksStore = tasksStore.filter((task) => task.id !== id);
  return { ok: true };
});
const mockDuplicateTask = vi.fn(async (id: string) => {
  const original = tasksStore.find((task) => task.id === id)!;
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
  tasksStore = tasksStore.map((task) =>
    task.id === id
      ? {
          ...task,
          status: "completed",
          completed_at: new Date().toISOString(),
        }
      : task
  );
  return tasksStore.find((task) => task.id === id)!;
});

vi.mock("../api/tasks", () => ({
  listTasks: () => mockListTasks(),
  createTask: (payload: Partial<Task>) => mockCreateTask(payload),
  updateTask: (id: string, payload: Partial<Task>) => mockUpdateTask(id, payload),
  deleteTask: (id: string) => mockDeleteTask(id),
  duplicateTask: (id: string) => mockDuplicateTask(id),
  completeTask: (id: string) => mockCompleteTask(id),
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
  mockListTasks.mockClear();
  mockCreateTask.mockClear();
  mockUpdateTask.mockClear();
  mockDeleteTask.mockClear();
  mockDuplicateTask.mockClear();
  mockCompleteTask.mockClear();
});

describe("TodoList", () => {
  it("creates a task and displays it", async () => {
    renderWithClient();

    fireEvent.change(screen.getByPlaceholderText("New task"), {
      target: { value: "My Task" },
    });
    fireEvent.click(screen.getByText("Add Task"));

    await waitFor(() => expect(mockCreateTask).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("My Task")).toBeInTheDocument());
  });

  it("updates a task", async () => {
    tasksStore = [
      {
        id: "task-1",
        user_id: "00000000-0000-0000-0000-000000000001",
        name: "Original",
        description: null,
        project_id: null,
        due_date: null,
        tags: [],
        status: "pending",
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    renderWithClient();

    await waitFor(() => expect(screen.getByText("Original")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Edit"));

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Updated")).toBeInTheDocument());
  });

  it("duplicates a task", async () => {
    tasksStore = [
      {
        id: "task-1",
        user_id: "00000000-0000-0000-0000-000000000001",
        name: "Copy Me",
        description: null,
        project_id: null,
        due_date: null,
        tags: [],
        status: "pending",
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    renderWithClient();
    await waitFor(() => expect(screen.getByText("Copy Me")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Duplicate"));

    await waitFor(() => expect(mockDuplicateTask).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText("Copy Me").length).toBe(2));
  });

  it("deletes a task", async () => {
    tasksStore = [
      {
        id: "task-1",
        user_id: "00000000-0000-0000-0000-000000000001",
        name: "Remove Me",
        description: null,
        project_id: null,
        due_date: null,
        tags: [],
        status: "pending",
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    renderWithClient();
    await waitFor(() => expect(screen.getByText("Remove Me")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => expect(mockDeleteTask).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Remove Me")).not.toBeInTheDocument());
  });

  it("shows an error when create fails", async () => {
    mockCreateTask.mockRejectedValueOnce(new Error("Create failed"));

    renderWithClient();

    fireEvent.change(screen.getByPlaceholderText("New task"), {
      target: { value: "Will Fail" },
    });
    fireEvent.click(screen.getByText("Add Task"));

    await waitFor(() => expect(mockCreateTask).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Create failed")).toBeInTheDocument());
  });
});
