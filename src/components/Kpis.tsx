import type { Course } from "../types";
import { formatHours, scheduledHours } from "../lib/format";
import { needsTutor } from "../lib/schedule";

export function Kpis({ courses, filtered, narrowed }: { courses: Course[]; filtered: Course[]; narrowed: boolean }) {
  const urgent = filtered.filter(needsTutor).length;
  const waiting = filtered.filter((course) => course.status === "Waiting for response").length;
  const assigned = filtered.filter((course) => course.status === "Assigned");
  const instructors = new Set(
    assigned.map((course) => (course.instructorEmail || course.instructorName || "").trim().toLowerCase()).filter(Boolean),
  );
  const hours = filtered.reduce((sum, course) => sum + scheduledHours(course), 0);

  const cards = [
    { id: "kpi-total", label: "Total Courses", value: String(filtered.length), detail: "In the current view" },
    { id: "kpi-needs", label: "Available / Needs Tutor", value: String(urgent), detail: "Unassigned or still available" },
    { id: "kpi-waiting", label: "Waiting for Response", value: String(waiting), detail: "Offer sent" },
    {
      id: "kpi-assigned",
      label: "Assigned Staff",
      value: String(assigned.length),
      detail: `${instructors.size} distinct instructor${instructors.size === 1 ? "" : "s"}`,
    },
    { id: "kpi-hours", label: "Scheduled Teaching Hours", value: formatHours(hours), detail: "Duration × meeting dates" },
  ];

  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-label="Roster metrics">
      {cards.map((card) => (
        <article key={card.id} data-testid={card.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{card.value}</p>
          <p className="text-xs text-slate-500">{card.detail}</p>
        </article>
      ))}
      {narrowed ? (
        <p className="text-xs text-slate-500 sm:col-span-2 xl:col-span-5" data-testid="kpi-caption">
          KPIs follow this view ({filtered.length} of {courses.length} courses). Unfiltered roster total is {courses.length}.
        </p>
      ) : null}
    </section>
  );
}
