import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, deleteProject, updateProject } from "../api/projects";
import { Project } from "../types";
import Modal from "./Modal";

const PROJECT_COLORS = [
  "#1d6b62",
  "#eb8b5a",
  "#5569d8",
  "#9b6ef3",
  "#c05621",
  "#2f855a",
  "#d6456b",
  "#3b82f6",
];

export default function ProjectDialog({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(project);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    setName(project?.name || "");
    setDescription(project?.description || "");
    setColor(project?.color || PROJECT_COLORS[0]);
  }, [open, project]);

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const create = useMutation({
    mutationFn: () => createProject({ name, description: description || null, color }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
  });

  const save = useMutation({
    mutationFn: () => {
      if (!project) throw new Error("No project");
      return updateProject(project.id, { name, description: description || null, color });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!project) throw new Error("No project");
      return deleteProject(project.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  return (
    <Modal open={open} title={isEdit ? "Project Details" : "Create Project"} onClose={onClose}>
      <div className="grid gap-5">
        <div className="grid gap-4">
          <label className="text-sm">
            <span className="st-label">Name</span>
            <input
              className="st-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
            />
          </label>

          <label className="text-sm">
            <span className="st-label">Description</span>
            <textarea
              className="st-textarea"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project moving forward?"
            />
          </label>

          <div className="text-sm">
            <span className="st-label">Color</span>
            <div className="mt-3 flex flex-wrap gap-3">
              {PROJECT_COLORS.map((option) => {
                const selected = option === color;
                return (
                  <button
                    key={option}
                    type="button"
                    className={`h-11 w-11 rounded-2xl border-2 transition ${selected ? "scale-105 border-[color:var(--st-ink)]" : "border-white/70"}`}
                    style={{ backgroundColor: option }}
                    aria-label={`Select ${option} for project`}
                    aria-pressed={selected}
                    onClick={() => setColor(option)}
                  />
                );
              })}
            </div>
          </div>

          <div className="section-card">
            <p className="st-kicker text-[color:var(--st-accent)]">Preview</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: color }} />
              <div>
                <p className="text-base font-bold text-[color:var(--st-ink)]">{name || "Untitled project"}</p>
                <p className="text-sm text-[color:var(--st-ink-soft)]">
                  {description || "A clean home for project-specific tasks."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isEdit && (
            <button className="st-button-primary disabled:opacity-50" disabled={!isValid || create.isPending} onClick={() => create.mutate()}>
              Create Project
            </button>
          )}

          {isEdit && (
            <>
              <button className="st-button-primary disabled:opacity-50" disabled={!isValid || save.isPending} onClick={() => save.mutate()}>
                Save
              </button>
              <button className="st-button-danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
                Archive Project
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
