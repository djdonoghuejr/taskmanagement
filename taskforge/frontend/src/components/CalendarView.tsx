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
    <div className="section-card">
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
