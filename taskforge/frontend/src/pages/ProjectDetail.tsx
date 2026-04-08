import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "../api/projects";
import { getTaskDependencies, listTasks } from "../api/tasks";
import TaskDialog from "../components/TaskDialog";
import ProjectDialog from "../components/ProjectDialog";
import { Project, Task, TaskDependencies } from "../types";

type ProjectView = "timeline" | "dependencies" | "list";
type TimelineZoom = "week" | "month";

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function normalizeView(value: string | null): ProjectView {
  if (value === "dependencies" || value === "list" || value === "timeline") return value;
  return "timeline";
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function daysBetween(start: Date, end: Date) {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000);
}

function scheduledCount(tasks: Task[]) {
  return tasks.filter((task) => task.start_date || task.due_date).length;
}

function overdueCount(tasks: Task[]) {
  const today = startOfDay(new Date());
  return tasks.filter((task) => task.status !== "completed" && task.due_date && toDate(task.due_date) && (toDate(task.due_date) as Date) < today).length;
}

function summarizeProjectTasks(tasks: Task[]) {
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === "completed").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    scheduled: scheduledCount(tasks),
    unscheduled: tasks.filter((task) => !task.start_date && !task.due_date).length,
    overdue: overdueCount(tasks),
  };
}

function timelineGroups(tasks: Task[]) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const monthEnd = addDays(today, 30);

  const sorted = [...tasks].sort((left, right) => {
    const leftStart = left.start_date || left.due_date || "9999-12-31";
    const rightStart = right.start_date || right.due_date || "9999-12-31";
    return leftStart.localeCompare(rightStart) || left.name.localeCompare(right.name);
  });

  return {
    overdue: sorted.filter((task) => task.status !== "completed" && task.due_date && toDate(task.due_date) && (toDate(task.due_date) as Date) < today),
    today: sorted.filter((task) => task.status !== "completed" && task.due_date && toDate(task.due_date)?.getTime() === today.getTime()),
    thisWeek: sorted.filter((task) => {
      const start = toDate(task.start_date);
      const due = toDate(task.due_date);
      const anchor = start || due;
      if (task.status === "completed" || !anchor) return false;
      return anchor >= tomorrow && anchor <= weekEnd;
    }),
    later: sorted.filter((task) => {
      const start = toDate(task.start_date);
      const due = toDate(task.due_date);
      const anchor = start || due;
      if (task.status === "completed" || !anchor) return false;
      return anchor > weekEnd && anchor <= monthEnd;
    }),
    unscheduled: sorted.filter((task) => task.status !== "completed" && !task.start_date && !task.due_date),
    completed: sorted.filter((task) => task.status === "completed"),
  };
}

function taskDependencyMeta(task: Task, deps: TaskDependencies | undefined, projectTaskIds: Set<string>) {
  const blockedBy = (deps?.blocked_by || []).filter((item) => projectTaskIds.has(item.id));
  const blocking = (deps?.blocking || []).filter((item) => projectTaskIds.has(item.id));
  return { blockedBy, blocking };
}

function statusBadgeClass(status: Task["status"]) {
  if (status === "blocked") return "st-badge st-badge-warning";
  if (status === "completed") return "st-badge st-badge-success";
  return "st-badge";
}

function ProjectTaskSummaryCard({
  task,
  blockedByCount,
  blockingCount,
  onOpen,
}: {
  task: Task;
  blockedByCount: number;
  blockingCount: number;
  onOpen: (task: Task) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="st-surface w-full p-4 text-left transition hover:-translate-y-0.5 hover:bg-white"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-[color:var(--st-ink)]">{task.name}</p>
            <span className={statusBadgeClass(task.status)}>{task.status}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--st-ink-soft)]">
            {task.start_date ? <span>Starts {task.start_date}</span> : null}
            {task.due_date ? <span>Due {task.due_date}</span> : null}
            {!task.start_date && !task.due_date ? <span>Unscheduled</span> : null}
            {task.expected_minutes ? <span>{task.expected_minutes} min expected</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {blockedByCount > 0 ? <span className="st-badge st-badge-warning">Blocked by {blockedByCount}</span> : null}
          {blockingCount > 0 ? <span className="st-badge st-badge-brand">Blocking {blockingCount}</span> : null}
        </div>
      </div>
    </button>
  );
}

function ProjectTimelineSection({
  title,
  description,
  tasks,
  dependencyMeta,
  onOpen,
}: {
  title: string;
  description: string;
  tasks: Task[];
  dependencyMeta: Record<string, TaskDependencies>;
  onOpen: (task: Task) => void;
}) {
  const projectTaskIds = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);

  return (
    <section className="section-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="section-copy mt-1">{description}</p>
        </div>
        <span className="st-badge">{tasks.length} tasks</span>
      </div>

      {tasks.length === 0 ? (
        <div className="st-surface p-4 text-sm text-[color:var(--st-ink-soft)]">Nothing here right now.</div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => {
            const meta = taskDependencyMeta(task, dependencyMeta[task.id], projectTaskIds);
            return (
              <ProjectTaskSummaryCard
                key={task.id}
                task={task}
                blockedByCount={meta.blockedBy.length}
                blockingCount={meta.blocking.length}
                onOpen={onOpen}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProjectDependencySection({
  title,
  description,
  tasks,
  dependencyMeta,
  taskById,
  onOpen,
}: {
  title: string;
  description: string;
  tasks: Task[];
  dependencyMeta: Record<string, TaskDependencies>;
  taskById: Map<string, Task>;
  onOpen: (task: Task) => void;
}) {
  return (
    <section className="section-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="section-copy mt-1">{description}</p>
        </div>
        <span className="st-badge">{tasks.length} tasks</span>
      </div>

      {tasks.length === 0 ? (
        <div className="st-surface p-4 text-sm text-[color:var(--st-ink-soft)]">Nothing here right now.</div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => {
            const deps = dependencyMeta[task.id];
            return (
              <div key={task.id} className="section-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <button type="button" className="text-left" onClick={() => onOpen(task)}>
                      <p className="text-base font-bold text-[color:var(--st-ink)]">{task.name}</p>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={statusBadgeClass(task.status)}>{task.status}</span>
                      {task.start_date ? <span className="st-badge">Starts {task.start_date}</span> : null}
                      {task.due_date ? <span className="st-badge">Due {task.due_date}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(deps?.blocked_by || []).map((dependency) => {
                      const linkedTask = taskById.get(dependency.id);
                      if (!linkedTask) return null;
                      return (
                        <button
                          key={`blocked-by-${task.id}-${dependency.id}`}
                          type="button"
                          className="st-badge st-badge-warning"
                          onClick={() => onOpen(linkedTask)}
                        >
                          Blocked by {dependency.name}
                        </button>
                      );
                    })}
                    {(deps?.blocking || []).map((dependency) => {
                      const linkedTask = taskById.get(dependency.id);
                      if (!linkedTask) return null;
                      return (
                        <button
                          key={`blocking-${task.id}-${dependency.id}`}
                          type="button"
                          className="st-badge st-badge-brand"
                          onClick={() => onOpen(linkedTask)}
                        >
                          Blocking {dependency.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TimelineWorkspace({
  tasks,
  dependencyMeta,
  selectedTaskId,
  zoom,
  setZoom,
  onOpen,
}: {
  tasks: Task[];
  dependencyMeta: Record<string, TaskDependencies>;
  selectedTaskId: string | null;
  zoom: TimelineZoom;
  setZoom: (zoom: TimelineZoom) => void;
  onOpen: (task: Task) => void;
}) {
  const scheduledTasks = useMemo(
    () =>
      tasks.filter((task) => task.start_date || task.due_date).sort((left, right) => {
        const leftAnchor = left.start_date || left.due_date || "9999-12-31";
        const rightAnchor = right.start_date || right.due_date || "9999-12-31";
        return leftAnchor.localeCompare(rightAnchor) || left.name.localeCompare(right.name);
      }),
    [tasks]
  );

  const unscheduledTasks = useMemo(
    () => tasks.filter((task) => !task.start_date && !task.due_date),
    [tasks]
  );

  const windowData = useMemo(() => {
    const today = startOfDay(new Date());
    const anchors = scheduledTasks.flatMap((task) => [toDate(task.start_date), toDate(task.due_date)]).filter(Boolean) as Date[];
    const minDate = anchors.length ? anchors.reduce((min, current) => (current < min ? current : min), today) : today;
    const maxDate = anchors.length ? anchors.reduce((max, current) => (current > max ? current : max), today) : addDays(today, zoom === "week" ? 6 : 29);
    const minimumEnd = addDays(minDate, zoom === "week" ? 6 : 29);
    const endDate = maxDate > minimumEnd ? maxDate : minimumEnd;
    const dayCount = daysBetween(minDate, endDate) + 1;
    const dates = Array.from({ length: dayCount }, (_, index) => addDays(minDate, index));
    return { start: minDate, end: endDate, dates };
  }, [scheduledTasks, zoom]);

  const rowHeight = 76;
  const connections = useMemo(() => {
    const rows = new Map(scheduledTasks.map((task, index) => [task.id, index]));
    return scheduledTasks.flatMap((task) => {
      const taskMeta = dependencyMeta[task.id];
      const taskStart = toDate(task.start_date) || toDate(task.due_date);
      if (!taskMeta || !taskStart) return [];
      const taskRow = rows.get(task.id);
      if (taskRow === undefined) return [];
      const targetX = ((daysBetween(windowData.start, taskStart) + 0.5) / windowData.dates.length) * 100;

      return taskMeta.blocked_by.flatMap((blocker) => {
        const blockerTask = scheduledTasks.find((candidate) => candidate.id === blocker.id);
        const blockerDate = blockerTask ? (toDate(blockerTask.due_date) || toDate(blockerTask.start_date)) : null;
        const blockerRow = rows.get(blocker.id);
        if (!blockerDate || blockerRow === undefined) return [];
        const sourceX = ((daysBetween(windowData.start, blockerDate) + 0.5) / windowData.dates.length) * 100;
        return [{
          key: `${blocker.id}-${task.id}`,
          x1: sourceX,
          y1: blockerRow * rowHeight + rowHeight / 2,
          x2: targetX,
          y2: taskRow * rowHeight + rowHeight / 2,
        }];
      });
    });
  }, [dependencyMeta, scheduledTasks, windowData]);

  return (
    <section className="section-card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="st-kicker text-[color:var(--st-brand)]">Timeline</p>
          <h3 className="section-title mt-2">Roadmap</h3>
          <p className="section-copy mt-1">See how work moves across time and where dependencies create pressure.</p>
        </div>
        <div className="st-pill-group self-start" role="group" aria-label="Timeline zoom">
          <button className={`st-pill-toggle ${zoom === "week" ? "st-pill-toggle-active" : ""}`} onClick={() => setZoom("week")}>
            Week
          </button>
          <button className={`st-pill-toggle ${zoom === "month" ? "st-pill-toggle-active" : ""}`} onClick={() => setZoom("month")}>
            Month
          </button>
        </div>
      </div>

      {scheduledTasks.length === 0 ? (
        <div className="st-surface p-4 text-sm text-[color:var(--st-ink-soft)]">
          No scheduled tasks yet. Add a start date, due date, or both to place work on the project timeline.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-[240px_minmax(520px,1fr)] gap-4">
              <div className="pt-12">
                {scheduledTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpen(task)}
                    className={`flex h-[76px] w-full flex-col justify-center rounded-[20px] border px-4 text-left transition ${
                      selectedTaskId === task.id
                        ? "border-[color:rgba(29,107,98,0.22)] bg-[color:var(--st-brand-soft)]"
                        : "border-[color:var(--st-border)] bg-white/75"
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-[color:var(--st-ink)]">{task.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={statusBadgeClass(task.status)}>{task.status}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="relative">
                <div
                  className="grid rounded-[22px] border border-[color:var(--st-border)] bg-white/65"
                  style={{ gridTemplateColumns: `repeat(${windowData.dates.length}, minmax(36px, 1fr))` }}
                >
                  {windowData.dates.map((day) => (
                    <div key={day.toISOString()} className="border-b border-r border-[color:rgba(91,84,74,0.08)] px-1 py-3 text-center last:border-r-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--st-ink-muted)]">
                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--st-ink)]">
                        {day.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="relative mt-3 overflow-hidden rounded-[24px] border border-[color:var(--st-border)] bg-[color:rgba(255,255,255,0.72)]">
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${windowData.dates.length}, minmax(36px, 1fr))` }}
                  >
                    {scheduledTasks.map((task) => (
                      windowData.dates.map((day, index) => {
                        const isToday = toIsoDate(day) === toIsoDate(startOfDay(new Date()));
                        return (
                          <div
                            key={`${task.id}-${index}`}
                            className={`h-[76px] border-r border-b border-[color:rgba(91,84,74,0.08)] last:border-r-0 ${isToday ? "bg-[color:rgba(29,107,98,0.04)]" : ""}`}
                          />
                        );
                      })
                    ))}
                  </div>

                  <div className="pointer-events-none absolute inset-0 hidden md:block">
                    <svg width="100%" height={scheduledTasks.length * rowHeight} className="overflow-visible">
                      {connections.map((connection) => (
                        <path
                          key={connection.key}
                          d={`M ${connection.x1}% ${connection.y1} C ${connection.x1 + 6}% ${connection.y1}, ${connection.x2 - 6}% ${connection.y2}, ${connection.x2}% ${connection.y2}`}
                          fill="none"
                          stroke="rgba(183, 121, 31, 0.65)"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />
                      ))}
                    </svg>
                  </div>

                  <div className="absolute inset-0">
                    {scheduledTasks.map((task, rowIndex) => {
                      const start = toDate(task.start_date) || toDate(task.due_date);
                      const end = toDate(task.due_date) || toDate(task.start_date);
                      if (!start || !end) return null;
                      const left = (daysBetween(windowData.start, start) / windowData.dates.length) * 100;
                      const width = ((daysBetween(start, end) + 1) / windowData.dates.length) * 100;
                      const isMilestone = task.start_date === null || task.due_date === null || task.start_date === task.due_date || !task.start_date || !task.due_date;
                      const top = rowIndex * rowHeight + 18;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onOpen(task)}
                          className={`absolute h-10 rounded-full px-3 text-left text-xs font-bold shadow-sm transition ${
                            task.status === "blocked"
                              ? "bg-[color:var(--st-warning-soft)] text-[color:var(--st-warning)]"
                              : task.status === "completed"
                                ? "bg-[color:var(--st-bg-subtle)] text-[color:var(--st-ink-muted)] opacity-80"
                                : overdueCount([task]) > 0
                                  ? "bg-[color:var(--st-danger-soft)] text-[color:var(--st-danger)]"
                                  : "bg-[color:var(--st-brand-soft)] text-[color:var(--st-brand-strong)]"
                          } ${selectedTaskId === task.id ? "ring-2 ring-[color:rgba(29,107,98,0.24)]" : ""}`}
                          style={{
                            left: `${left}%`,
                            top,
                            width: isMilestone ? "18px" : `calc(${width}% - 8px)`,
                            minWidth: isMilestone ? "18px" : "52px",
                            borderRadius: isMilestone ? "999px" : "999px",
                          }}
                          aria-label={`${task.name} timeline item`}
                        >
                          {!isMilestone ? <span className="truncate">{task.name}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {unscheduledTasks.length > 0 ? (
            <div className="section-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="section-title">Unscheduled</h3>
                  <p className="section-copy mt-1">Tasks without a start or due date still connected to the project.</p>
                </div>
                <span className="st-badge">{unscheduledTasks.length} tasks</span>
              </div>
              <div className="mt-4 grid gap-3">
                {unscheduledTasks.map((task) => {
                  const deps = dependencyMeta[task.id];
                  return (
                    <ProjectTaskSummaryCard
                      key={task.id}
                      task={task}
                      blockedByCount={(deps?.blocked_by || []).length}
                      blockingCount={(deps?.blocking || []).length}
                      onOpen={onOpen}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [zoom, setZoom] = useState<TimelineZoom>("month");

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });

  const currentView = normalizeView(params.get("view"));
  const project = projects.find((entry) => entry.id === id);
  const projectTasks = tasks.filter((task) => task.project_id === id);
  const projectTaskIds = new Set(projectTasks.map((task) => task.id));
  const taskById = new Map(projectTasks.map((task) => [task.id, task]));

  const { data: dependencyEntries = [] } = useQuery({
    queryKey: ["tasks", "dependencies", "project-detail", projectTasks.map((task) => task.id).join(",")],
    queryFn: async () =>
      Promise.all(
        projectTasks.map(async (task) => ({
          taskId: task.id,
          data: await getTaskDependencies(task.id),
        }))
      ),
    enabled: projectTasks.length > 0,
  });

  const dependencyMeta = useMemo<Record<string, TaskDependencies>>(() => {
    const next: Record<string, TaskDependencies> = {};
    const dependencyMap = new Map(dependencyEntries.map((entry) => [entry.taskId, entry.data]));
    projectTasks.forEach((task) => {
      const data = dependencyMap.get(task.id);
      if (!data) {
        next[task.id] = { blocked_by: [], blocking: [] };
        return;
      }
      next[task.id] = {
        blocked_by: data.blocked_by.filter((item) => projectTaskIds.has(item.id)),
        blocking: data.blocking.filter((item) => projectTaskIds.has(item.id)),
      };
    });
    return next;
  }, [dependencyEntries, projectTaskIds, projectTasks]);

  const dependencySections = useMemo(() => {
    return {
      ready: projectTasks.filter((task) => task.status === "pending"),
      blocked: projectTasks.filter((task) => task.status === "blocked"),
      blocking: projectTasks.filter((task) => task.status !== "completed" && (dependencyMeta[task.id]?.blocking.length || 0) > 0),
      completed: projectTasks.filter((task) => task.status === "completed"),
    };
  }, [dependencyMeta, projectTasks]);

  const setView = (view: ProjectView) => {
    const next = new URLSearchParams(params);
    next.set("view", view);
    setParams(next, { replace: true });
  };

  if (id === "overview") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <p className="st-kicker text-[color:var(--st-accent)]">Project map</p>
            <h2 className="page-title mt-2">Projects</h2>
            <p className="page-subtitle">Create focused project spaces, then assign tasks into them from the task editor.</p>
          </div>
          <button className="st-button-primary w-full sm:w-auto" onClick={() => {
            setEditingProject(null);
            setProjectDialogOpen(true);
          }}>
            Create Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="section-card">
            <p className="st-kicker text-[color:var(--st-accent)]">Empty space</p>
            <h3 className="section-title mt-2">No projects yet</h3>
            <p className="section-copy mt-1">Start a project to group related tasks and see their timeline in one place.</p>
            <button className="st-button-primary mt-5" onClick={() => {
              setEditingProject(null);
              setProjectDialogOpen(true);
            }}>
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const projectTasks = tasks.filter((task) => task.project_id === project.id);
              const summary = summarizeProjectTasks(projectTasks);
              return (
                <div key={project.id} className="section-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: project.color }} />
                      <div>
                        <p className="text-lg font-bold text-[color:var(--st-ink)]">{project.name}</p>
                        <p className="mt-1 text-sm text-[color:var(--st-ink-soft)]">{project.description || "No description yet."}</p>
                      </div>
                    </div>
                    <button
                      className="st-button-secondary px-3 py-2 text-xs"
                      onClick={() => {
                        setEditingProject(project);
                        setProjectDialogOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="st-surface p-3">
                      <p className="st-kicker">Scheduled</p>
                      <p className="mt-2 text-2xl font-extrabold">{summary.scheduled}</p>
                    </div>
                    <div className="st-surface p-3">
                      <p className="st-kicker">Blocked</p>
                      <p className="mt-2 text-2xl font-extrabold">{summary.blocked}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-sm text-[color:var(--st-ink-soft)]">{summary.unscheduled} unscheduled</span>
                    <Link className="st-button-primary px-4 py-2 text-sm" to={`/projects/${project.id}`}>
                      Open project
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ProjectDialog
          open={projectDialogOpen}
          project={editingProject}
          onClose={() => {
            setProjectDialogOpen(false);
            setEditingProject(null);
          }}
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="section-card">
        <h2 className="section-title">Project not found</h2>
        <p className="section-copy mt-2">This project may have been archived or never existed.</p>
        <Link className="st-button-primary mt-5 inline-flex" to="/projects/overview">
          Back to Projects
        </Link>
      </div>
    );
  }

  const summary = summarizeProjectTasks(projectTasks);
  const groups = timelineGroups(projectTasks);

  return (
    <div className="space-y-6">
      <div className="section-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: project.color }} />
            <div>
              <p className="st-kicker text-[color:var(--st-accent)]">Project workspace</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">{project.name}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--st-ink-soft)]">
                {project.description || "No description yet. Use this space to track project-specific work over time."}
              </p>
            </div>
          </div>
          <button
            className="st-button-secondary w-full sm:w-auto"
            onClick={() => {
              setEditingProject(project);
              setProjectDialogOpen(true);
            }}
          >
            Edit Project
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <div className="st-surface p-4">
            <p className="st-kicker">Scheduled</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.scheduled}</p>
          </div>
          <div className="st-surface p-4">
            <p className="st-kicker">Unscheduled</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.unscheduled}</p>
          </div>
          <div className="st-surface p-4">
            <p className="st-kicker">Blocked</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.blocked}</p>
          </div>
          <div className="st-surface p-4">
            <p className="st-kicker">Overdue</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.overdue}</p>
          </div>
          <div className="st-surface p-4">
            <p className="st-kicker">Completed</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.completed}</p>
          </div>
        </div>
      </div>

      <div className="st-pill-group" role="tablist" aria-label="Project view">
        <button
          role="tab"
          aria-selected={currentView === "timeline"}
          className={`st-pill-toggle ${currentView === "timeline" ? "st-pill-toggle-active" : ""}`}
          onClick={() => setView("timeline")}
        >
          Timeline
        </button>
        <button
          role="tab"
          aria-selected={currentView === "dependencies"}
          className={`st-pill-toggle ${currentView === "dependencies" ? "st-pill-toggle-active" : ""}`}
          onClick={() => setView("dependencies")}
        >
          Dependencies
        </button>
        <button
          role="tab"
          aria-selected={currentView === "list"}
          className={`st-pill-toggle ${currentView === "list" ? "st-pill-toggle-active" : ""}`}
          onClick={() => setView("list")}
        >
          List
        </button>
      </div>

      {projectTasks.length === 0 ? (
        <div className="section-card">
          <p className="st-kicker text-[color:var(--st-brand)]">No mapped work yet</p>
          <h3 className="section-title mt-2">This project doesn&apos;t have any tasks yet</h3>
          <p className="section-copy mt-2">
            Create tasks from the Tasks view, then assign this project from the task details modal.
          </p>
          <Link className="st-button-primary mt-5 inline-flex" to="/tasks">
            Go to Tasks
          </Link>
        </div>
      ) : currentView === "timeline" ? (
        <TimelineWorkspace
          tasks={projectTasks}
          dependencyMeta={dependencyMeta}
          selectedTaskId={selectedTask?.id || null}
          zoom={zoom}
          setZoom={setZoom}
          onOpen={setSelectedTask}
        />
      ) : currentView === "dependencies" ? (
        <div className="space-y-4">
          {Object.values(dependencyMeta).every((entry) => entry.blocked_by.length === 0 && entry.blocking.length === 0) ? (
            <div className="section-card">
              <p className="st-kicker text-[color:var(--st-brand)]">No dependency graph yet</p>
              <h3 className="section-title mt-2">Nothing is linked yet</h3>
              <p className="section-copy mt-2">Use task details to set Blocked by and Blocking relationships for this project.</p>
            </div>
          ) : null}

          <ProjectDependencySection
            title="Blocked"
            description="Tasks waiting on other project work before they can move."
            tasks={dependencySections.blocked}
            dependencyMeta={dependencyMeta}
            taskById={taskById}
            onOpen={setSelectedTask}
          />
          <ProjectDependencySection
            title="Ready"
            description="Tasks that are not blocked and can move next."
            tasks={dependencySections.ready}
            dependencyMeta={dependencyMeta}
            taskById={taskById}
            onOpen={setSelectedTask}
          />
          <ProjectDependencySection
            title="Blocking Others"
            description="Tasks whose completion unlocks more work in the project."
            tasks={dependencySections.blocking}
            dependencyMeta={dependencyMeta}
            taskById={taskById}
            onOpen={setSelectedTask}
          />
          <ProjectDependencySection
            title="Completed"
            description="Finished work and the relationships it resolved."
            tasks={dependencySections.completed}
            dependencyMeta={dependencyMeta}
            taskById={taskById}
            onOpen={setSelectedTask}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <ProjectTimelineSection title="Overdue" description="Tasks that should already be moving." tasks={groups.overdue} dependencyMeta={dependencyMeta} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="Due Today" description="The work that matters today." tasks={groups.today} dependencyMeta={dependencyMeta} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="This Week" description="Short-horizon project tasks coming up next." tasks={groups.thisWeek} dependencyMeta={dependencyMeta} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="Later / Next 30 Days" description="Work further out but still on the near roadmap." tasks={groups.later} dependencyMeta={dependencyMeta} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="Unscheduled" description="Tasks that belong to the project but need a start or due date." tasks={groups.unscheduled} dependencyMeta={dependencyMeta} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="Completed" description="Finished work kept visible but visually quiet." tasks={groups.completed} dependencyMeta={dependencyMeta} onOpen={setSelectedTask} />
        </div>
      )}

      <TaskDialog open={Boolean(selectedTask)} task={selectedTask} onClose={() => setSelectedTask(null)} />
      <ProjectDialog
        open={projectDialogOpen}
        project={editingProject}
        onClose={() => {
          setProjectDialogOpen(false);
          setEditingProject(null);
        }}
      />
    </div>
  );
}
