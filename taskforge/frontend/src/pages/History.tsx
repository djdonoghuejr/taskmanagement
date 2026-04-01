import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, reopenTask, updateTask } from "../api/tasks";
import {
  listRecurring,
  listRecurringCompletionsRange,
  undoRecurringCompletion,
  updateRecurringCompletion,
} from "../api/recurring";
import { listProjects } from "../api/projects";

type HistoryType = "all" | "tasks" | "recurring";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function History({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<7 | 30 | "custom">(7);
  const [customStart, setCustomStart] = useState(isoDaysAgo(7));
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));
  const [typeFilter, setTypeFilter] = useState<HistoryType>("all");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");

  const start = preset === "custom" ? customStart : isoDaysAgo(preset);
  const end = preset === "custom" ? customEnd : new Date().toISOString().slice(0, 10);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const { data: recurringItems = [] } = useQuery({
    queryKey: ["recurring"],
    queryFn: listRecurring,
  });

  const { data: completedTasks = [] } = useQuery({
    queryKey: ["tasks", "history", start, end],
    queryFn: () =>
      listTasks({
        status: "completed",
        completed_after: start,
        completed_before: end,
        order_by: "completed_at",
        sort: "desc",
      }),
  });

  const { data: recurringCompletions = [] } = useQuery({
    queryKey: ["recurring", "completions", "range", start, end],
    queryFn: () => listRecurringCompletionsRange(start, end),
  });

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const recurringById = useMemo(
    () => new Map(recurringItems.map((r) => [r.id, r])),
    [recurringItems]
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const task of completedTasks) {
      for (const t of task.tags) tags.add(t);
    }
    return Array.from(tags).sort();
  }, [completedTasks]);

  const reopen = useMutation({
    mutationFn: reopenTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const saveTaskNotes = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updateTask(id, { completion_notes: notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const saveRecurringNotes = useMutation({
    mutationFn: ({
      id,
      date,
      notes,
    }: {
      id: string;
      date: string;
      notes: string;
    }) => updateRecurringCompletion(id, date, notes),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recurring", "completions", "range", start, end] }),
  });

  const undoRecurring = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => undoRecurringCompletion(id, date),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recurring", "completions", "range", start, end] }),
  });

  const [notesEditor, setNotesEditor] = useState<{
    mode: "task" | "recurring";
    id: string;
    date?: string;
    title: string;
    notes: string;
  } | null>(null);

  const filteredTasks = useMemo(() => {
    return completedTasks.filter((t) => {
      if (projectFilter && t.project_id !== projectFilter) return false;
      if (tagFilter && !t.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [completedTasks, projectFilter, tagFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { tasks: typeof filteredTasks; recurring: typeof recurringCompletions }>();
    const add = (key: string) => {
      if (!map.has(key)) map.set(key, { tasks: [], recurring: [] });
      return map.get(key)!;
    };

    if (typeFilter !== "recurring") {
      for (const task of filteredTasks) {
        const day = task.completed_at ? task.completed_at.slice(0, 10) : "unknown";
        add(day).tasks.push(task);
      }
    }
    if (typeFilter !== "tasks") {
      for (const completion of recurringCompletions) {
        add(completion.completed_date).recurring.push(completion);
      }
    }

    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filteredTasks, recurringCompletions, typeFilter]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold">History</h2>
            <p className="text-slate-600">What you've finished</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-slate-300 bg-white p-1 text-sm">
            <button
              className={`rounded-full px-3 py-1.5 ${preset === 7 ? "bg-slate-900 text-white" : "text-slate-700"}`}
              onClick={() => setPreset(7)}
            >
              7d
            </button>
            <button
              className={`rounded-full px-3 py-1.5 ${preset === 30 ? "bg-slate-900 text-white" : "text-slate-700"}`}
              onClick={() => setPreset(30)}
            >
              30d
            </button>
            <button
              className={`rounded-full px-3 py-1.5 ${preset === "custom" ? "bg-slate-900 text-white" : "text-slate-700"}`}
              onClick={() => setPreset("custom")}
            >
              Custom
            </button>
          </div>

          {preset === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as HistoryType)}
          >
            <option value="all">All</option>
            <option value="tasks">Tasks</option>
            <option value="recurring">Recurring</option>
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">All tags</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {grouped.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No history in this range.
          </div>
        )}
        {grouped.map(([day, items]) => (
          <div key={day} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{new Date(day).toLocaleDateString()}</h3>
              <span className="text-xs text-slate-500">
                {items.tasks.length + items.recurring.length} items
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {items.tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{task.name}</p>
                      <p className="text-xs text-slate-500">
                        {task.project_id ? projectsById.get(task.project_id)?.name : "No project"}
                      </p>
                      {task.completion_notes && (
                        <p className="mt-1 text-sm text-slate-700">{task.completion_notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                        onClick={() =>
                          setNotesEditor({
                            mode: "task",
                            id: task.id,
                            title: task.name,
                            notes: task.completion_notes || "",
                          })
                        }
                      >
                        Edit notes
                      </button>
                      <button
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
                        onClick={() => reopen.mutate(task.id)}
                      >
                        Reopen
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {items.recurring.map((c) => {
                const item = recurringById.get(c.recurring_item_id);
                return (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item?.name || "Recurring item"}</p>
                        <p className="text-xs text-slate-500">Recurring completion</p>
                        {c.completion_notes && (
                          <p className="mt-1 text-sm text-slate-700">{c.completion_notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                          onClick={() =>
                            setNotesEditor({
                              mode: "recurring",
                              id: c.recurring_item_id,
                              date: c.completed_date,
                              title: item?.name || "Recurring item",
                              notes: c.completion_notes || "",
                            })
                          }
                        >
                          Edit notes
                        </button>
                        <button
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                          onClick={() => undoRecurring.mutate({ id: c.recurring_item_id, date: c.completed_date })}
                        >
                          Undo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {notesEditor && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Edit Notes</h3>
            <button className="text-sm text-slate-500" onClick={() => setNotesEditor(null)}>
              Close
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600">{notesEditor.title}</p>
          <textarea
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={3}
            value={notesEditor.notes}
            onChange={(e) => setNotesEditor({ ...notesEditor, notes: e.target.value })}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={() => {
                if (notesEditor.mode === "task") {
                  saveTaskNotes.mutate({ id: notesEditor.id, notes: notesEditor.notes });
                } else {
                  saveRecurringNotes.mutate({
                    id: notesEditor.id,
                    date: notesEditor.date!,
                    notes: notesEditor.notes,
                  });
                }
                setNotesEditor(null);
              }}
            >
              Save
            </button>
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
              onClick={() => setNotesEditor(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
