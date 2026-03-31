import { useState } from "react";

export default function RecurringForm({
  onSubmit,
}: {
  onSubmit: (payload: { name: string; cadence_type: string }) => void;
}) {
  const [name, setName] = useState("");
  const [cadence, setCadence] = useState("daily");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, cadence_type: cadence });
        setName("");
        setCadence("daily");
      }}
    >
      <div className="flex-1">
        <label className="text-xs text-slate-500">Name</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Recurring item"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">Cadence</label>
        <select
          className="mt-1 rounded-md border border-slate-300 px-3 py-2"
          value={cadence}
          onChange={(e) => setCadence(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
        Add Recurring
      </button>
    </form>
  );
}
