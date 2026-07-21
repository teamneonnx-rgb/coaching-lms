"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";

// shadcn <Calendar> with colored dot indicators under dates that have activity
// (UI spec). `eventDates` are yyyy-mm-dd strings; assignment dots plug in here
// once assessments land in Phase 7.
export function StudentCalendar({ eventDates }: { eventDates: string[] }) {
  const [month, setMonth] = useState<Date>(new Date());

  const events = eventDates.map((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  });

  return (
    <Calendar
      mode="single"
      month={month}
      onMonthChange={setMonth}
      showOutsideDays
      className="w-full"
      modifiers={{ event: events }}
      modifiersClassNames={{
        event:
          "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-orange-500 after:content-['']",
      }}
    />
  );
}
