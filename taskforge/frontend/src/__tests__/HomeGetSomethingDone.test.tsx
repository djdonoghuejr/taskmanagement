import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Home from "../pages/Home";
import { TaskSuggestion } from "../types";

const mockSuggestion = vi.fn<() => Promise<TaskSuggestion>>();

vi.mock("../api/tasks", () => ({
  getSomethingDone: (params: { minutes: number; exclude_ids?: string[] }) => mockSuggestion(params),
}));

vi.mock("../pages/Today", () => ({ default: () => <div>Today view</div> }));
vi.mock("../pages/Upcoming", () => ({ default: () => <div>Upcoming view</div> }));
vi.mock("../pages/History", () => ({ default: () => <div>History view</div> }));

function renderHome() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockSuggestion.mockReset();
});

describe("Home Get Something Done", () => {
  it("requests a time-fit task and can request another option", async () => {
    mockSuggestion
      .mockResolvedValueOnce({
        selection_mode: "estimated",
        message: 'You can knock out "Inbox zero" in about 15 minutes.',
        task: {
          id: "task-1",
          user_id: "user-1",
          name: "Inbox zero",
          description: "Clear urgent email",
          project_id: null,
          can_be_done_virtually: true,
          expected_minutes: 15,
          start_date: null,
          due_date: null,
          tags: [],
          status: "pending",
          completed_at: null,
          completion_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
      .mockResolvedValueOnce({
        selection_mode: "fallback",
        message: 'Get started on "Outline proposal".',
        task: {
          id: "task-2",
          user_id: "user-1",
          name: "Outline proposal",
          description: null,
          project_id: null,
          can_be_done_virtually: false,
          expected_minutes: null,
          start_date: null,
          due_date: null,
          tags: [],
          status: "pending",
          completed_at: null,
          completion_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

    renderHome();

    fireEvent.click(screen.getByText("Get Something Done"));
    fireEvent.change(screen.getByPlaceholderText("20"), { target: { value: "20" } });
    fireEvent.click(screen.getByText("Find a task"));

    await waitFor(() => expect(mockSuggestion).toHaveBeenCalledWith({ minutes: 20, exclude_ids: [] }));
    expect(await screen.findByText("Inbox zero")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Give me another option"));

    await waitFor(() =>
      expect(mockSuggestion).toHaveBeenLastCalledWith({ minutes: 20, exclude_ids: ["task-1"] })
    );
    expect(await screen.findByText("Outline proposal")).toBeInTheDocument();
  });
});
