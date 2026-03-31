import { RecurringItem } from "../types";

export default function RecurringItemRow({
  item,
  checked,
  onToggle,
  disabled = false,
}: {
  item: RecurringItem;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
      <div>
        <p className="font-medium text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-500">{item.cadence_type}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={onToggle} disabled={disabled} />
    </div>
  );
}
