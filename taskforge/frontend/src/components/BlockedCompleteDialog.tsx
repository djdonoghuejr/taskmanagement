import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeTask, getTaskDependencies, updateTask } from "../api/tasks";
import Modal from "./Modal";

export default function BlockedCompleteDialog({
  open,
  taskId,
  taskName,
  onClose,
  onViewBlockers,
}: {
  open: boolean;
  taskId: string | null;
  taskName: string;
  onClose: () => void;
  onViewBlockers: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: deps } = useQuery({
    queryKey: ["tasks", "dependencies", "blocked-complete", taskId],
    queryFn: () => getTaskDependencies(taskId as string),
    enabled: open && Boolean(taskId),
  });

  const removeBlocksAndComplete = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error("No task");
      await updateTask(taskId, {
        blocked_by_ids: [],
        activity_comment: "Removed blockers to complete",
      });
      await completeTask(taskId, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "dependencies", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "activity", taskId] });
      onClose();
    },
  });

  const blockerCount = deps?.blocked_by?.length ?? 0;

  return (
    <Modal open={open} title="Task is blocked" onClose={onClose}>
      <div className="grid gap-4">
        <div className="section-card">
          <p className="st-kicker text-[color:var(--st-warning)]">Dependency warning</p>
          <p className="mt-2 text-sm text-[color:var(--st-ink-soft)]">
            <span className="font-semibold">{taskName}</span> is blocked by{" "}
            <span className="font-semibold">{blockerCount}</span> task(s).
          </p>
          {deps && deps.blocked_by.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--st-ink-soft)]">
              {deps.blocked_by.slice(0, 5).map((b) => (
                <li key={b.id}>{b.name}</li>
              ))}
              {deps.blocked_by.length > 5 && <li>…and more</li>}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button className="st-button-secondary w-full sm:w-auto" onClick={onClose}>
            Cancel
          </button>
          <button className="st-button-secondary w-full sm:w-auto" onClick={() => {
              onClose();
              onViewBlockers();
            }}>
            View blockers
          </button>
          <button
            className="st-button-primary w-full disabled:opacity-50 sm:w-auto"
            disabled={removeBlocksAndComplete.isPending}
            onClick={() => removeBlocksAndComplete.mutate()}
          >
            Remove blocks &amp; complete
          </button>
        </div>
      </div>
    </Modal>
  );
}
