import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTaskComment,
  completeTask,
  createTask,
  deleteTask,
  duplicateTask,
  getTask,
  getTaskDependencies,
  listTaskActivity,
  reopenTask,
  searchTasks,
  updateTask,
} from "../api/tasks";
import { Task, TaskActivity, TaskSummary } from "../types";
import Modal from "./Modal";
import BlockedCompleteDialog from "./BlockedCompleteDialog";

function formatActivityTitle(a: TaskActivity): string {
  if (a.type === "created") return "Created";
  if (a.type === "comment") return "Comment";
  if (a.type === "due_date_changed") return "Due date changed";
  if (a.type === "status_changed") return "Status changed";
  if (a.type === "dependencies_changed") return "Dependencies changed";
  return a.type;
}

function formatMeta(a: TaskActivity): string | null {
  const m = a.meta || {};
  if (a.type === "due_date_changed") {
    return `${m.old_due_date || "None"} → ${m.new_due_date || "None"}`;
  }
  if (a.type === "status_changed") {
    return `${m.old_status || "?"} → ${m.new_status || "?"}`;
  }
  if (a.type === "created") {
    const due = m.due_date ? `Due: ${m.due_date}` : null;
    const assigned = m.assigned_to ? `Assigned to: ${m.assigned_to}` : null;
    return [due, assigned].filter(Boolean).join(" • ") || null;
  }
  return null;
}

function uniqById(items: TaskSummary[]): TaskSummary[] {
  const seen = new Set<string>();
  const out: TaskSummary[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

export default function TaskDialog({
  open,
  task,
  initialDueDate,
  focusCompletionNotes = false,
  onClose,
}: {
  open: boolean;
  task: Task | null;
  initialDueDate?: string;
  focusCompletionNotes?: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [taskStack, setTaskStack] = useState<string[]>([]);
  const currentTaskId = taskStack.length ? taskStack[taskStack.length - 1] : null;
  const isEdit = Boolean(currentTaskId);

  useEffect(() => {
    if (!open) return;
    if (task?.id) setTaskStack([task.id]);
    else setTaskStack([]);
  }, [open, task?.id]);

  const { data: currentTask } = useQuery({
    queryKey: ["tasks", "detail", currentTaskId],
    queryFn: () => getTask(currentTaskId as string),
    enabled: open && Boolean(currentTaskId),
  });

  const effectiveTask = currentTask || task;
  const projectId = effectiveTask?.project_id || undefined;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const completionNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const [blockedConfirmOpen, setBlockedConfirmOpen] = useState(false);

  const [depScope, setDepScope] = useState<"all" | "project">("all");
  const [blockedBy, setBlockedBy] = useState<TaskSummary[]>([]);
  const [blocking, setBlocking] = useState<TaskSummary[]>([]);
  const [depsDirty, setDepsDirty] = useState(false);

  const [blockedByQuery, setBlockedByQuery] = useState("");
  const [blockingQuery, setBlockingQuery] = useState("");

  const { data: deps } = useQuery({
    queryKey: ["tasks", "dependencies", currentTaskId],
    queryFn: () => getTaskDependencies(currentTaskId as string),
    enabled: open && Boolean(currentTaskId),
  });

  // Sync dependencies when opening a new task in the stack
  useEffect(() => {
    if (!open) return;
    setDepsDirty(false);
    setBlockedBy([]);
    setBlocking([]);
    setBlockedByQuery("");
    setBlockingQuery("");
    setDepScope("all");
  }, [open, currentTaskId]);

  useEffect(() => {
    if (!open) return;
    if (!isEdit) return;
    if (!deps) return;
    if (depsDirty) return;
    setBlockedBy(deps.blocked_by);
    setBlocking(deps.blocking);
  }, [open, isEdit, deps, depsDirty]);

  useEffect(() => {
    if (!open) return;
    setName(effectiveTask?.name || "");
    setDescription(effectiveTask?.description || "");
    setDueDate(effectiveTask?.due_date || initialDueDate || "");
    setReason("");
    setComment("");
    setCompletionNotes("");
  }, [open, effectiveTask?.id, initialDueDate]);

  useEffect(() => {
    if (!open) return;
    if (!isEdit) return;
    if (!focusCompletionNotes) return;
    if (effectiveTask?.status !== "pending") return;
    const t = window.setTimeout(() => completionNotesRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, isEdit, focusCompletionNotes, effectiveTask?.status]);

  const { data: activity = [] } = useQuery({
    queryKey: ["tasks", "activity", currentTaskId],
    queryFn: () => listTaskActivity(currentTaskId as string),
    enabled: open && Boolean(currentTaskId),
  });

  const blockedByResults = useQuery({
    queryKey: ["tasks", "search", "blocked_by", depScope, projectId, currentTaskId, blockedByQuery],
    queryFn: () =>
      searchTasks({
        q: blockedByQuery,
        scope: depScope,
        project_id: depScope === "project" ? projectId : undefined,
        exclude_id: currentTaskId || undefined,
        limit: 20,
      }),
    enabled: open && Boolean(blockedByQuery.trim().length),
  });

  const blockingResults = useQuery({
    queryKey: ["tasks", "search", "blocking", depScope, projectId, currentTaskId, blockingQuery],
    queryFn: () =>
      searchTasks({
        q: blockingQuery,
        scope: depScope,
        project_id: depScope === "project" ? projectId : undefined,
        exclude_id: currentTaskId || undefined,
        limit: 20,
      }),
    enabled: open && Boolean(blockingQuery.trim().length),
  });

  const canUseProjectScope = Boolean(projectId);

  useEffect(() => {
    if (depScope === "project" && !canUseProjectScope) setDepScope("all");
  }, [depScope, canUseProjectScope]);

  const create = useMutation({
    mutationFn: () =>
      createTask({
        name,
        description: description || null,
        due_date: dueDate || null,
        blocked_by_ids: blockedBy.map((t) => t.id),
        blocking_ids: blocking.map((t) => t.id),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  const save = useMutation({
    mutationFn: () => {
      if (!currentTaskId) throw new Error("No task");
      return updateTask(currentTaskId, {
        name,
        description: description || null,
        due_date: dueDate || null,
        blocked_by_ids: blockedBy.map((t) => t.id),
        blocking_ids: blocking.map((t) => t.id),
        activity_comment: reason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "dependencies", currentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "activity", currentTaskId] });
      setDepsDirty(false);
      setReason("");
    },
  });

  const addCommentMut = useMutation({
    mutationFn: () => {
      if (!currentTaskId) throw new Error("No task");
      return addTaskComment(currentTaskId, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "activity", currentTaskId] });
      setComment("");
    },
  });

  const complete = useMutation({
    mutationFn: () => {
      if (!currentTaskId) throw new Error("No task");
      return completeTask(currentTaskId, completionNotes || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "activity", currentTaskId] });
      setCompletionNotes("");
    },
  });

  const reopen = useMutation({
    mutationFn: () => {
      if (!currentTaskId) throw new Error("No task");
      return reopenTask(currentTaskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "activity", currentTaskId] });
    },
  });

  const duplicate = useMutation({
    mutationFn: () => {
      if (!currentTaskId) throw new Error("No task");
      return duplicateTask(currentTaskId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!currentTaskId) throw new Error("No task");
      return deleteTask(currentTaskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  const title = isEdit ? "Task Details" : "Add Task";
  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const addBlockedBy = (t: TaskSummary) => {
    setBlockedBy((prev) => uniqById([...prev, t]));
    setDepsDirty(true);
    setBlockedByQuery("");
  };

  const addBlocking = (t: TaskSummary) => {
    setBlocking((prev) => uniqById([...prev, t]));
    setDepsDirty(true);
    setBlockingQuery("");
  };

  const openTaskId = (id: string) => {
    if (!id) return;
    if (taskStack.includes(id)) return;
    setTaskStack((prev) => [...prev, id]);
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      backButton={
        taskStack.length > 1
          ? {
              label: "Back",
              onClick: () => setTaskStack((prev) => prev.slice(0, -1)),
            }
          : undefined
      }
    >
      <div className="grid gap-4">
        {isEdit && effectiveTask && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                effectiveTask.status === "blocked"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Status: {effectiveTask.status}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              Assigned: You
            </span>
          </div>
        )}

        <div className="grid gap-3">
          <label className="text-sm">
            <span className="text-slate-600">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Task name"
            />
          </label>

          <label className="text-sm">
            <span className="text-slate-600">Description</span>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this about?"
            />
          </label>

          <label className="text-sm">
            <span className="text-slate-600">Due Date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">Dependencies</p>
              <div className="flex rounded-full border border-slate-300 bg-white p-1 text-xs">
                <button
                  className={`rounded-full px-3 py-1 ${
                    depScope === "all" ? "bg-slate-900 text-white" : "text-slate-700"
                  }`}
                  onClick={() => setDepScope("all")}
                  type="button"
                >
                  All tasks
                </button>
                <button
                  className={`rounded-full px-3 py-1 ${
                    depScope === "project" ? "bg-slate-900 text-white" : "text-slate-700"
                  } ${canUseProjectScope ? "" : "opacity-50"}`}
                  onClick={() => canUseProjectScope && setDepScope("project")}
                  type="button"
                  disabled={!canUseProjectScope}
                  title={!canUseProjectScope ? "Task has no project" : undefined}
                >
                  This project
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Blocked by
                </p>
                <div className="space-y-2">
                  {blockedBy.length === 0 && (
                    <p className="text-sm text-slate-600">No blockers.</p>
                  )}
                  {blockedBy.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-900 hover:underline"
                        onClick={() => openTaskId(t.id)}
                      >
                        {t.name}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        onClick={() => {
                          setBlockedBy((prev) => prev.filter((x) => x.id !== t.id));
                          setDepsDirty(true);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={blockedByQuery}
                    onChange={(e) => setBlockedByQuery(e.target.value)}
                    placeholder="Search tasks…"
                  />
                  {blockedByQuery.trim() && (blockedByResults.data?.length || 0) > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow">
                      {blockedByResults.data!
                        .filter((r) => !blockedBy.some((b) => b.id === r.id))
                        .slice(0, 10)
                        .map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => addBlockedBy(r)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{r.name}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {r.status}
                              </span>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Blocking
                </p>
                <div className="space-y-2">
                  {blocking.length === 0 && (
                    <p className="text-sm text-slate-600">Not blocking anything.</p>
                  )}
                  {blocking.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-900 hover:underline"
                        onClick={() => openTaskId(t.id)}
                      >
                        {t.name}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        onClick={() => {
                          setBlocking((prev) => prev.filter((x) => x.id !== t.id));
                          setDepsDirty(true);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={blockingQuery}
                    onChange={(e) => setBlockingQuery(e.target.value)}
                    placeholder="Search tasks…"
                  />
                  {blockingQuery.trim() && (blockingResults.data?.length || 0) > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow">
                      {blockingResults.data!
                        .filter((r) => !blocking.some((b) => b.id === r.id))
                        .slice(0, 10)
                        .map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => addBlocking(r)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{r.name}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {r.status}
                              </span>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isEdit && (
            <label className="text-sm">
              <span className="text-slate-600">Comment / Reason (optional)</span>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you changing it?"
              />
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            {!isEdit && (
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={!isValid || create.isPending}
                onClick={() => create.mutate()}
              >
                Save
              </button>
            )}

            {isEdit && (
              <>
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                  disabled={!isValid || save.isPending}
                  onClick={() => save.mutate()}
                >
                  Save
                </button>
                {effectiveTask?.status !== "completed" ? (
                  <button
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
                    onClick={() => {
                      if (effectiveTask?.status === "blocked") {
                        setBlockedConfirmOpen(true);
                        return;
                      }
                      complete.mutate();
                    }}
                    disabled={complete.isPending}
                  >
                    Complete
                  </button>
                ) : (
                  <button
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
                    onClick={() => reopen.mutate()}
                    disabled={reopen.isPending}
                  >
                    Reopen
                  </button>
                )}
                <button
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
                  onClick={() => duplicate.mutate()}
                  disabled={duplicate.isPending}
                >
                  Duplicate
                </button>
                <button
                  className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-800"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {isEdit && (
          <>
            {effectiveTask?.status !== "completed" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">Completion notes (optional)</p>
                <textarea
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  rows={2}
                  ref={completionNotesRef}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="What happened?"
                />
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">Activity</p>

              <div className="mt-3 space-y-2">
                {activity.length === 0 && <p className="text-sm text-slate-600">No activity yet.</p>}
                {activity.map((a) => {
                  const meta = formatMeta(a);
                  return (
                    <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{formatActivityTitle(a)}</p>
                        <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                      {meta && <p className="mt-1 text-xs text-slate-600">{meta}</p>}
                      {a.message && <p className="mt-2 text-sm text-slate-800">{a.message}</p>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-2">
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…"
                />
                <div className="flex justify-end">
                  <button
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                    disabled={!comment.trim() || addCommentMut.isPending}
                    onClick={() => addCommentMut.mutate()}
                  >
                    Add Comment
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <BlockedCompleteDialog
        open={blockedConfirmOpen}
        taskId={currentTaskId}
        taskName={effectiveTask?.name || "Task"}
        onClose={() => setBlockedConfirmOpen(false)}
        onViewBlockers={() => {}}
      />
    </Modal>
  );
}
