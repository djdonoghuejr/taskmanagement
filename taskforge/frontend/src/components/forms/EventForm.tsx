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
      className="flex flex-wrap items-end gap-3"
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
        <label className="st-label text-xs">Title</label>
        <input
          className="st-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
        />
      </div>
      <div>
        <label className="st-label text-xs">Start</label>
        <input
          type="datetime-local"
          className="st-input"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div>
        <label className="st-label text-xs">End</label>
        <input
          type="datetime-local"
          className="st-input"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <button className="st-button-primary">Add Event</button>
    </form>
  );
}
