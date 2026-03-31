import { RecurringItem } from "../types";

export function isDueOn(target: Date, item: RecurringItem): boolean {
  if (!item.is_active) return false;

  if (item.cadence_type === "daily") return true;

  if (item.cadence_type === "weekly") {
    if (!item.cadence_days || item.cadence_days.length === 0) return false;
    const weekday = (target.getDay() + 6) % 7; // convert JS Sunday=0 to Monday=0
    return item.cadence_days.includes(weekday);
  }

  if (item.cadence_type === "monthly") {
    if (!item.cadence_day_of_month) return false;
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const day = Math.min(item.cadence_day_of_month, lastDay);
    return target.getDate() === day;
  }

  if (item.cadence_type === "custom") {
    if (!item.cadence_days || item.cadence_days.length === 0) return false;
    const interval = item.cadence_days[0];
    if (interval <= 0) return false;
    const startDate = new Date(item.created_at);
    const targetMid = new Date(target);
    targetMid.setHours(0, 0, 0, 0);
    const startMid = new Date(startDate);
    startMid.setHours(0, 0, 0, 0);
    const diffMs = targetMid.getTime() - startMid.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % interval === 0;
  }

  return false;
}
