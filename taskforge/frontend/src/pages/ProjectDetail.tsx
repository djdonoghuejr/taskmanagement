import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "../api/projects";
import { listTasks } from "../api/tasks";
import TaskCard from "../components/TaskCard";
import TaskDialog from "../components/TaskDialog";
import ProjectDialog from "../components/ProjectDialog";
import { Project, Task } from "../types";

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

function summarizeProjectTasks(tasks: Task[]) {
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === "completed").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    dueSoon: tasks.filter((task) => task.status !== "completed" && task.due_date).length,
  };
}

function timelineGroups(tasks: Task[]) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const monthEnd = addDays(today, 30);

  const sorted = [...tasks].sort((left, right) => {
    const leftDue = left.due_date || "9999-12-31";
    const rightDue = right.due_date || "9999-12-31";
    return leftDue.localeCompare(rightDue) || left.name.localeCompare(right.name);
  });

  return {
    overdue: sorted.filter((task) => task.status !== "completed" && task.due_date && startOfDay(new Date(task.due_date)) < today),
    today: sorted.filter((task) => task.status !== "completed" && task.due_date && startOfDay(new Date(task.due_date)).getTime() === today.getTime()),
    thisWeek: sorted.filter((task) => {
      if (task.status === "completed" || !task.due_date) return false;
      const due = startOfDay(new Date(task.due_date));
      return due >= tomorrow && due <= weekEnd;
    }),
    later: sorted.filter((task) => {
      if (task.status === "completed" || !task.due_date) return false;
      const due = startOfDay(new Date(task.due_date));
      return due > weekEnd && due <= monthEnd;
    }),
    unscheduled: sorted.filter((task) => task.status !== "completed" && !task.due_date),
    completed: sorted.filter((task) => task.status === "completed"),
  };
}

function ProjectTimelineSection({
  title,
  description,
  tasks,
  onOpen,
}: {
  title: string;
  description: string;
  tasks: Task[];
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
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onOpen(task)} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });

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
                        <p className="mt-1 text-sm text-[color:var(--st-ink-soft)]">
                          {project.description || "No description yet."}
                        </p>
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
                      <p className="st-kicker">Open</p>
                      <p className="mt-2 text-2xl font-extrabold">{summary.total - summary.completed}</p>
                    </div>
                    <div className="st-surface p-3">
                      <p className="st-kicker">Blocked</p>
                      <p className="mt-2 text-2xl font-extrabold">{summary.blocked}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-sm text-[color:var(--st-ink-soft)]">{summary.dueSoon} task(s) scheduled</span>
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

  const project = projects.find((entry) => entry.id === id);

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

  const projectTasks = tasks.filter((task) => task.project_id === id);
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

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="st-surface p-4">
            <p className="st-kicker">Open tasks</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.total - summary.completed}</p>
          </div>
          <div className="st-surface p-4">
            <p className="st-kicker">Completed</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.completed}</p>
          </div>
          <div className="st-surface p-4">
            <p className="st-kicker">Blocked</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.blocked}</p>
          </div>
          <div className="st-surface p-4">
            <p className="st-kicker">Scheduled</p>
            <p className="mt-2 text-3xl font-extrabold">{summary.dueSoon}</p>
          </div>
        </div>
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
      ) : (
        <div className="space-y-4">
          <ProjectTimelineSection title="Overdue" description="Tasks that should already be moving." tasks={groups.overdue} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="Due Today" description="The work that matters today." tasks={groups.today} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="This Week" description="Short-horizon project tasks coming up next." tasks={groups.thisWeek} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="Later / Next 30 Days" description="Work further out but still on the near roadmap." tasks={groups.later} onOpen={setSelectedTask} />
          <ProjectTimelineSection title="Unscheduled" description="Tasks that belong to the project but need a date." tasks={groups.unscheduled} onOpen={setSelectedTask} />
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
