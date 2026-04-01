import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listRecurring,
  completeRecurring,
  undoRecurringCompletion,
  listRecurringCompletions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  updateRecurringCompletion,
} from "../api/recurring";
import RecurringItemRow from "../components/RecurringItemRow";
import RecurringForm from "../components/forms/RecurringForm";
import { isDueOn } from "../utils/recurring";
import { RecurringItem } from "../types";

export default function RecurringChecklist() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: recurring = [] } = useQuery({
    queryKey: ["recurring"],
    queryFn: listRecurring,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["recurring", "completions", today],
    queryFn: () => listRecurringCompletions(today),
  });

  const completionIds = new Set(completions.map((c) => c.recurring_item_id));
  const completionNotesMap = new Map(
    completions.map((c) => [c.recurring_item_id, c.completion_notes || ""])
  );
  const todayDate = new Date();

  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [notesTarget, setNotesTarget] = useState<RecurringItem | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [completeTarget, setCompleteTarget] = useState<RecurringItem | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");

  const grouped = {
    daily: recurring.filter((r) => r.cadence_type === "daily"),
    weekly: recurring.filter((r) => r.cadence_type === "weekly"),
    monthly: recurring.filter((r) => r.cadence_type === "monthly"),
    custom: recurring.filter((r) => r.cadence_type === "custom"),
  };

  const toggleCompletion = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      if (completionIds.has(id)) {
        return undoRecurringCompletion(id, today);
      }
      return completeRecurring(id, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", "completions", today] });
    },
  });

  const addRecurring = useMutation({
    mutationFn: createRecurring,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring"] }),
  });

  const saveRecurring = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RecurringItem> }) =>
      updateRecurring(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      setEditingItem(null);
    },
  });

  const removeRecurring = useMutation({
    mutationFn: deleteRecurring,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring"] }),
  });

  const saveNotes = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      updateRecurringCompletion(id, today, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", "completions", today] });
      setNotesTarget(null);
    },
  });

  const openEdit = (item: RecurringItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || "");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Recurring Checklist</h2>
      <RecurringForm onSubmit={(payload) => addRecurring.mutate(payload)} />
      {Object.entries(grouped).map(([label, items]) => (
        <div key={label} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </h3>
          <div className="grid gap-2">
            {items.map((item) => {
              const dueToday = isDueOn(todayDate, item);
              const hasCompletion = completionIds.has(item.id);
              return (
                <div key={item.id} className={dueToday ? "" : "opacity-60"}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <RecurringItemRow
                        item={item}
                        checked={hasCompletion}
                        onToggle={() => {
                          if (!dueToday) return;
                          if (hasCompletion) {
                            toggleCompletion.mutate({ id: item.id });
                          } else {
                            setCompleteTarget(item);
                            setCompleteNotes("");
                          }
                        }}
                        disabled={!dueToday}
                      />
                    </div>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                      onClick={() => openEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                      onClick={() => removeRecurring.mutate(item.id)}
                    >
                      Delete
                    </button>
                    {hasCompletion && (
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                        onClick={() => {
                          setNotesTarget(item);
                          setNotesValue(completionNotesMap.get(item.id) || "");
                        }}
                      >
                        Notes
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {completeTarget && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Complete Recurring Item</h3>
            <button className="text-sm text-slate-500" onClick={() => setCompleteTarget(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <p className="text-sm text-slate-600">{completeTarget.name}</p>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              rows={3}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() => {
                  toggleCompletion.mutate({
                    id: completeTarget.id,
                    notes: completeNotes || undefined,
                  });
                  setCompleteTarget(null);
                }}
              >
                Save & Complete
              </button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                onClick={() => setCompleteTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Edit Recurring Item</h3>
            <button className="text-sm text-slate-500" onClick={() => setEditingItem(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">
              <span className="text-slate-600">Name</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">Description</span>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() =>
                  saveRecurring.mutate({
                    id: editingItem.id,
                    payload: { name: editName, description: editDescription || null },
                  })
                }
              >
                Save
              </button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {notesTarget && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Completion Notes</h3>
            <button className="text-sm text-slate-500" onClick={() => setNotesTarget(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <p className="text-sm text-slate-600">{notesTarget.name}</p>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              rows={3}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() =>
                  saveNotes.mutate({ id: notesTarget.id, notes: notesValue || undefined })
                }
              >
                Save Notes
              </button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                onClick={() => setNotesTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
