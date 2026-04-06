import { HabitMetrics } from "../types";

export default function MetricsCard({
  title,
  metrics,
}: {
  title: string;
  metrics: HabitMetrics;
}) {
  return (
    <div className="section-card">
      <p className="st-kicker text-[color:var(--st-habit)]">Metrics</p>
      <h3 className="mt-2 text-sm font-bold text-[color:var(--st-ink)]">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[color:var(--st-ink-soft)]">
        <div>7d: {metrics.completion_rate_7d}%</div>
        <div>30d: {metrics.completion_rate_30d}%</div>
        <div>Current: {metrics.current_streak}</div>
        <div>Longest: {metrics.longest_streak}</div>
      </div>
    </div>
  );
}
