import { useState } from "react";

export default function TaskForm({
  onSubmit,
}: {
  onSubmit: (payload: { name: string; due_date?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, due_date: dueDate || undefined });
        setName("");
        setDueDate("");
      }}
    >
      <div className="flex-1">
        <label className="text-xs text-slate-500">Task</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New task"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">Due</label>
        <input
          type="date"
          className="mt-1 rounded-md border border-slate-300 px-3 py-2"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
        Add Task
      </button>
    </form>
  );
}
