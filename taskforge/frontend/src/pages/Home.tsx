import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Today from "./Today";
import Upcoming from "./Upcoming";
import History from "./History";

type View = "today" | "upcoming" | "history";

function normalizeView(v: string | null): View {
  if (v === "upcoming" || v === "history" || v === "today") return v;
  return "today";
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => normalizeView(params.get("view")), [params]);

  const setView = (next: View) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("view", next);
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">Home</h2>
          <p className="text-slate-600">Today, upcoming, and history - one place.</p>
        </div>

        <div
          className="flex rounded-full border border-slate-300 bg-white p-1 text-sm"
          role="group"
          aria-label="Home view filter"
        >
          <button
            className={`rounded-full px-3 py-1.5 ${
              view === "today" ? "bg-slate-900 text-white" : "text-slate-700"
            }`}
            onClick={() => setView("today")}
          >
            Today
          </button>
          <button
            className={`rounded-full px-3 py-1.5 ${
              view === "upcoming" ? "bg-slate-900 text-white" : "text-slate-700"
            }`}
            onClick={() => setView("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={`rounded-full px-3 py-1.5 ${
              view === "history" ? "bg-slate-900 text-white" : "text-slate-700"
            }`}
            onClick={() => setView("history")}
          >
            History
          </button>
        </div>
      </div>

      {view === "today" && <Today embedded />}
      {view === "upcoming" && <Upcoming embedded />}
      {view === "history" && <History embedded />}
    </div>
  );
}
