import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, reopenTask, updateTask } from "../api/tasks";
import {
  listHabits,
  listHabitCompletionsRange,
  undoHabitCompletion,
  updateHabitCompletion,
} from "../api/habits";
import { listProjects } from "../api/projects";

type HistoryType = "all" | "tasks" | "habits";

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

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: listHabits,
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

  const { data: habitCompletions = [] } = useQuery({
    queryKey: ["habits", "completions", "range", start, end],
    queryFn: () => listHabitCompletionsRange(start, end),
  });

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const habitsById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

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

  const saveHabitNotes = useMutation({
    mutationFn: ({
      id,
      date,
      notes,
    }: {
      id: string;
      date: string;
      notes: string;
    }) => updateHabitCompletion(id, date, notes),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["habits", "completions", "range", start, end] }),
  });

  const undoHabit = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => undoHabitCompletion(id, date),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["habits", "completions", "range", start, end] }),
  });

  const [notesEditor, setNotesEditor] = useState<{
    mode: "task" | "habit";
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
    const map = new Map<string, { tasks: typeof filteredTasks; habits: typeof habitCompletions }>();
    const add = (key: string) => {
      if (!map.has(key)) map.set(key, { tasks: [], habits: [] });
      return map.get(key)!;
    };

    if (typeFilter !== "habits") {
      for (const task of filteredTasks) {
        const day = task.completed_at ? task.completed_at.slice(0, 10) : "unknown";
        add(day).tasks.push(task);
      }
    }
    if (typeFilter !== "tasks") {
      for (const completion of habitCompletions) {
        add(completion.completed_date).habits.push(completion);
      }
    }

    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filteredTasks, habitCompletions, typeFilter]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="st-kicker text-[color:var(--st-accent)]">Progress log</p>
            <h2 className="page-title mt-2">History</h2>
            <p className="page-subtitle">A cleaner record of completions, notes, and follow-through.</p>
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="st-pill-group text-sm">
            <button
              className={`st-pill-toggle ${preset === 7 ? "st-pill-toggle-active" : ""}`}
              onClick={() => setPreset(7)}
            >
              7d
            </button>
            <button
              className={`st-pill-toggle ${preset === 30 ? "st-pill-toggle-active" : ""}`}
              onClick={() => setPreset(30)}
            >
              30d
            </button>
            <button
              className={`st-pill-toggle ${preset === "custom" ? "st-pill-toggle-active" : ""}`}
              onClick={() => setPreset("custom")}
            >
              Custom
            </button>
          </div>

          {preset === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="date"
                className="st-input mt-0"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span className="text-[color:var(--st-ink-muted)]">to</span>
              <input
                type="date"
                className="st-input mt-0"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}

          <select
            className="st-select mt-0"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as HistoryType)}
          >
            <option value="all">All</option>
            <option value="tasks">Tasks</option>
            <option value="habits">Habits</option>
          </select>

          <select
            className="st-select mt-0"
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
            className="st-select mt-0"
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
          <div className="st-surface p-4 text-sm text-[color:var(--st-ink-soft)]">
            No history in this range.
          </div>
        )}
        {grouped.map(([day, items]) => (
          <div key={day} className="section-card">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{new Date(day).toLocaleDateString()}</h3>
              <span className="st-badge">
                {items.tasks.length + items.habits.length} items
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {items.tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-[color:var(--st-border)] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-[color:var(--st-ink)]">{task.name}</p>
                      <p className="text-xs text-[color:var(--st-ink-muted)]">
                        {task.project_id ? projectsById.get(task.project_id)?.name : "No project"}
                      </p>
                      {task.completion_notes && (
                        <p className="mt-2 text-sm text-[color:var(--st-ink-soft)]">{task.completion_notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="st-button-secondary"
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
                        className="st-button-primary"
                        onClick={() => reopen.mutate(task.id)}
                      >
                        Reopen
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {items.habits.map((c) => {
                const item = habitsById.get(c.habit_id);
                return (
                  <div key={c.id} className="rounded-2xl border border-[color:var(--st-border)] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-[color:var(--st-ink)]">{item?.name || "Habit"}</p>
                        <p className="text-xs text-[color:var(--st-ink-muted)]">Habit completion</p>
                        {c.completion_notes && (
                          <p className="mt-2 text-sm text-[color:var(--st-ink-soft)]">{c.completion_notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="st-button-secondary"
                          onClick={() =>
                            setNotesEditor({
                              mode: "habit",
                              id: c.habit_id,
                              date: c.completed_date,
                              title: item?.name || "Habit",
                              notes: c.completion_notes || "",
                            })
                          }
                        >
                          Edit notes
                        </button>
                        <button
                          className="st-button-secondary"
                          onClick={() => undoHabit.mutate({ id: c.habit_id, date: c.completed_date })}
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
        <div className="section-card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Edit Notes</h3>
            <button className="text-sm text-[color:var(--st-ink-soft)]" onClick={() => setNotesEditor(null)}>
              Close
            </button>
          </div>
          <p className="mt-1 text-sm text-[color:var(--st-ink-soft)]">{notesEditor.title}</p>
          <textarea
            className="st-textarea mt-3"
            rows={3}
            value={notesEditor.notes}
            onChange={(e) => setNotesEditor({ ...notesEditor, notes: e.target.value })}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="st-button-primary"
              onClick={() => {
                if (notesEditor.mode === "task") {
                  saveTaskNotes.mutate({ id: notesEditor.id, notes: notesEditor.notes });
                } else {
                  saveHabitNotes.mutate({
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
            <button className="st-button-secondary" onClick={() => setNotesEditor(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
