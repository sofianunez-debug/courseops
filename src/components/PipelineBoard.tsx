import { Mail, RotateCcw, UserCheck } from "lucide-react";
import type { Course } from "../types";
import { formatSchedule } from "../lib/format";

export function PipelineBoard({
  courses,
  onOffer,
  onConfirm,
  onReopen,
}: {
  courses: Course[];
  onOffer: (id: string) => void;
  onConfirm: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  const available = courses.filter((course) => course.status === "Available" || (course.status !== "Waiting for response" && course.status !== "Assigned" && course.status !== "Cancelled" && course.status !== "Ended" && !course.instructorName));
  const waiting = courses.filter((course) => course.status === "Waiting for response");
  const assigned = courses.filter((course) => course.status === "Assigned");
  const parked = courses.filter((course) => course.status === "Cancelled" || course.status === "Ended").length;

  const columns = [
    {
      title: "Available (Urgent)",
      tone: "border-amber-300 bg-amber-50/60",
      courses: available,
      empty: "No unassigned courses in this view.",
    },
    {
      title: "Waiting for Response",
      tone: "border-indigo-200 bg-indigo-50/50",
      courses: waiting,
      empty: "Nothing is waiting on a tutor.",
    },
    {
      title: "Assigned & Confirmed",
      tone: "border-emerald-200 bg-emerald-50/50",
      courses: assigned,
      empty: "No staffed courses in this view.",
    },
  ];

  return (
    <div data-testid="pipeline">
      <div className="grid gap-3 lg:grid-cols-3">
        {columns.map((column) => (
          <section key={column.title} className={`rounded-lg border ${column.tone} p-2.5`}>
            <header className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-900">{column.title}</h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{column.courses.length}</span>
            </header>
            <div className="space-y-2">
              {column.courses.length === 0 ? <p className="px-1 py-6 text-center text-xs text-slate-500">{column.empty}</p> : null}
              {column.courses.map((course) => (
                <article key={course.id} className="rounded-md border border-slate-200 bg-white p-2.5 shadow-sm" data-testid={`pipeline-${course.id}`}>
                  <p className="text-sm font-semibold text-slate-900">{course.name}</p>
                  <p className="text-xs text-slate-500">
                    {course.subject} · {course.productType}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{formatSchedule(course)}</p>
                  {course.instructorName ? (
                    <p className="mt-1 text-xs font-medium text-slate-800">
                      {course.instructorName}
                      <span className="block font-normal text-slate-500">{course.instructorEmail}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-800">No instructor</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {column.title.startsWith("Available") ? (
                      <>
                        <button type="button" className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800" onClick={() => onOffer(course.id)}>
                          <Mail size={12} /> Offer Email
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700" onClick={() => onOffer(course.id)} data-testid={`pipeline-assign-${course.id}`}>
                          <UserCheck size={12} /> Direct Assign
                        </button>
                      </>
                    ) : null}
                    {column.title.startsWith("Waiting") ? (
                      <>
                        <button type="button" className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white" onClick={() => onConfirm(course.id)} data-testid={`pipeline-confirm-${course.id}`}>
                          Confirm Assigned
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700" onClick={() => onReopen(course.id)} data-testid={`pipeline-reopen-${course.id}`}>
                          <RotateCcw size={12} /> Declined / Re-open
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      {parked > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          {parked} cancelled or ended course{parked === 1 ? "" : "s"} in this view {parked === 1 ? "is" : "are"} not on the board.
        </p>
      ) : null}
    </div>
  );
}
