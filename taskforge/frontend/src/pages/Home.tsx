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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="st-kicker text-[color:var(--st-brand)]">SecreTerry HQ</p>
          <h2 className="page-title mt-2">Everything in motion, one calm workspace.</h2>
          <p className="page-subtitle">Today, upcoming, and history arranged to help you steer the day without friction.</p>
        </div>

        <div className="st-pill-group" role="group" aria-label="Home view filter">
          <button
            className={`st-pill-toggle ${view === "today" ? "st-pill-toggle-active" : ""}`}
            onClick={() => setView("today")}
          >
            Today
          </button>
          <button
            className={`st-pill-toggle ${view === "upcoming" ? "st-pill-toggle-active" : ""}`}
            onClick={() => setView("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={`st-pill-toggle ${view === "history" ? "st-pill-toggle-active" : ""}`}
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
