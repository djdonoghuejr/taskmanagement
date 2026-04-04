import { HabitMetrics } from "../types";

export default function MetricsCard({
  title,
  metrics,
}: {
  title: string;
  metrics: HabitMetrics;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>7d: {metrics.completion_rate_7d}%</div>
        <div>30d: {metrics.completion_rate_30d}%</div>
        <div>Current: {metrics.current_streak}</div>
        <div>Longest: {metrics.longest_streak}</div>
      </div>
    </div>
  );
}
