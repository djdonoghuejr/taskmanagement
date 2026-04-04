import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  completeHabit,
  createHabit,
  deleteHabit,
  undoHabitCompletion,
  updateHabit,
} from "../api/habits";
import { CadenceType, Habit } from "../types";
import Modal from "./Modal";

const WEEKDAYS: Array<{ label: string; value: number }> = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];

export default function HabitDialog({
  open,
  habit,
  today,
  completedToday,
  onClose,
}: {
  open: boolean;
  habit: Habit | null;
  today: string;
  completedToday: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(habit);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cadenceType, setCadenceType] = useState<CadenceType>("daily");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([0]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [customInterval, setCustomInterval] = useState<number>(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(habit?.name || "");
    setDescription(habit?.description || "");
    setCadenceType((habit?.cadence_type as CadenceType) || "daily");
    setWeeklyDays(habit?.cadence_days && habit.cadence_days.length ? habit.cadence_days : [0]);
    setDayOfMonth(habit?.cadence_day_of_month || 1);
    setCustomInterval(habit?.cadence_days && habit.cadence_days.length ? habit.cadence_days[0] : 1);
    setNotes("");
  }, [open, habit]);

  const cadencePayload = useMemo(() => {
    if (cadenceType === "weekly") return { cadence_days: weeklyDays };
    if (cadenceType === "monthly") return { cadence_day_of_month: dayOfMonth };
    if (cadenceType === "custom") return { cadence_days: [customInterval] };
    return {};
  }, [cadenceType, weeklyDays, dayOfMonth, customInterval]);

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const create = useMutation({
    mutationFn: () =>
      createHabit({
        name,
        description: description || null,
        cadence_type: cadenceType,
        ...cadencePayload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      onClose();
    },
  });

  const save = useMutation({
    mutationFn: () => {
      if (!habit) throw new Error("No habit");
      return updateHabit(habit.id, {
        name,
        description: description || null,
        cadence_type: cadenceType,
        ...cadencePayload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!habit) throw new Error("No habit");
      return deleteHabit(habit.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits", "completions", today] });
      onClose();
    },
  });

  const completeToday = useMutation({
    mutationFn: () => {
      if (!habit) throw new Error("No habit");
      return completeHabit(habit.id, notes || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", "completions", today] });
      setNotes("");
    },
  });

  const undoToday = useMutation({
    mutationFn: () => {
      if (!habit) throw new Error("No habit");
      return undoHabitCompletion(habit.id, today);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", "completions", today] });
    },
  });

  const title = isEdit ? "Habit Details" : "Add Habit";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-3">
          <label className="text-sm">
            <span className="text-slate-600">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Habit name"
            />
          </label>

          <label className="text-sm">
            <span className="text-slate-600">Description</span>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does success look like?"
            />
          </label>

          <label className="text-sm">
            <span className="text-slate-600">Cadence</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={cadenceType}
              onChange={(e) => setCadenceType(e.target.value as CadenceType)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {cadenceType === "weekly" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">Days of week</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => {
                  const checked = weeklyDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-sm ${
                        checked
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                      onClick={() => {
                        setWeeklyDays((prev) =>
                          checked ? prev.filter((x) => x !== d.value) : [...prev, d.value].sort()
                        );
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {weeklyDays.length === 0 && (
                <p className="mt-2 text-xs text-rose-700">Select at least one day.</p>
              )}
            </div>
          )}

          {cadenceType === "monthly" && (
            <label className="text-sm">
              <span className="text-slate-600">Day of month</span>
              <input
                type="number"
                min={1}
                max={31}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value || 1))}
              />
            </label>
          )}

          {cadenceType === "custom" && (
            <label className="text-sm">
              <span className="text-slate-600">Every N days</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={customInterval}
                onChange={(e) => setCustomInterval(Number(e.target.value || 1))}
              />
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            {!isEdit && (
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={!isValid || (cadenceType === "weekly" && weeklyDays.length === 0) || create.isPending}
                onClick={() => create.mutate()}
              >
                Save
              </button>
            )}

            {isEdit && (
              <>
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                  disabled={!isValid || (cadenceType === "weekly" && weeklyDays.length === 0) || save.isPending}
                  onClick={() => save.mutate()}
                >
                  Save
                </button>
                <button
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
                  onClick={() => (completedToday ? undoToday.mutate() : completeToday.mutate())}
                  disabled={completeToday.isPending || undoToday.isPending}
                >
                  {completedToday ? "Undo Today" : "Complete Today"}
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">Completion notes (optional)</p>
            <textarea
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go?"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

