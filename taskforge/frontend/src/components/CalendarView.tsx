import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function CalendarView({
  events,
  onDatesSet,
}: {
  events: any[];
  onDatesSet: (arg: { startStr: string; endStr: string }) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        datesSet={(info) => onDatesSet({ startStr: info.startStr, endStr: info.endStr })}
      />
    </div>
  );
}
