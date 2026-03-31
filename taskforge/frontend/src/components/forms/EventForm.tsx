import { useState } from "react";

export default function EventForm({
  onSubmit,
}: {
  onSubmit: (payload: { title: string; start_time: string; end_time: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        if (!start || !end) return;
        const startIso = new Date(start).toISOString();
        const endIso = new Date(end).toISOString();
        onSubmit({ title, start_time: startIso, end_time: endIso });
        setTitle("");
        setStart("");
        setEnd("");
      }}
    >
      <div className="flex-1">
        <label className="text-xs text-slate-500">Title</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">Start</label>
        <input
          type="datetime-local"
          className="mt-1 rounded-md border border-slate-300 px-3 py-2"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">End</label>
        <input
          type="datetime-local"
          className="mt-1 rounded-md border border-slate-300 px-3 py-2"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
        Add Event
      </button>
    </form>
  );
}
