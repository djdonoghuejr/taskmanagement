import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import GetSomethingDoneDialog from "../components/GetSomethingDoneDialog";
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
  const [getSomethingDoneOpen, setGetSomethingDoneOpen] = useState(false);
  const view = useMemo(() => normalizeView(params.get("view")), [params]);

  const setView = (next: View) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("view", next);
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="st-kicker text-[color:var(--st-brand)]">SecreTerry HQ</p>
          <h2 className="page-title mt-2">Everything in motion, one calm workspace.</h2>
          <p className="page-subtitle">Today, upcoming, and history arranged to help you steer the day without friction.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button className="st-button-primary w-full sm:w-auto" onClick={() => setGetSomethingDoneOpen(true)}>
            Get Something Done
          </button>

          <div className="st-pill-group w-full justify-between sm:w-auto" role="group" aria-label="Home view filter">
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
      </div>

      {view === "today" && <Today embedded />}
      {view === "upcoming" && <Upcoming embedded />}
      {view === "history" && <History embedded />}
      <GetSomethingDoneDialog
        open={getSomethingDoneOpen}
        onClose={() => setGetSomethingDoneOpen(false)}
      />
    </div>
  );
}
