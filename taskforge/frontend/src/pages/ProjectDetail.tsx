import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "../api/projects";
import { listTasks } from "../api/tasks";
import { listHabits } from "../api/habits";
import TaskCard from "../components/TaskCard";
import TaskDialog from "../components/TaskDialog";
import { useState } from "react";
import { Task } from "../types";

export default function ProjectDetail() {
  const { id } = useParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: listHabits,
  });

  if (id === "overview") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Projects</h2>
        <div className="grid gap-2">
          {projects.map((project) => (
            <div key={project.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-500">{project.description}</p>
                </div>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const project = projects.find((p) => p.id === id);
  const projectTasks = tasks.filter((t) => t.project_id === id);
  const projectHabits = habits.filter((h) => h.project_id === id);

  if (!project) {
    return <div>Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
          <div>
            <h2 className="text-xl font-semibold">{project.name}</h2>
            <p className="text-sm text-slate-500">{project.description}</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Tasks</h3>
        <div className="grid gap-2">
          {projectTasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Habits</h3>
        <div className="grid gap-2">
          {projectHabits.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500">{item.cadence_type}</p>
            </div>
          ))}
        </div>
      </section>

      <TaskDialog open={Boolean(selectedTask)} task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}
