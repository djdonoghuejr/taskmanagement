import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import CalendarView from "../components/CalendarView";
import EventForm from "../components/forms/EventForm";
import { createEvent } from "../api/events";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["calendar", "feed", range],
    queryFn: async () => {
      if (!range) return [];
      return apiFetch<any[]>(`/calendar/feed?start=${range.start}&end=${range.end}`);
    },
  });

  const addEvent = useMutation({
    mutationFn: createEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar", "feed"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="st-kicker text-[color:var(--st-accent)]">Schedule view</p>
        <h2 className="page-title mt-2">Calendar</h2>
        <p className="page-subtitle">A clearer view of tasks, habits, and events over time.</p>
      </div>
      <div className="section-card">
        <EventForm onSubmit={(payload) => addEvent.mutate(payload)} />
      </div>
      <CalendarView
        events={events}
        onDatesSet={(info) =>
          setRange({ start: info.startStr.slice(0, 10), end: info.endStr.slice(0, 10) })
        }
      />
    </div>
  );
}
