import type { Course } from "../types";
import { formatDays, formatLongDate, formatMoney, formatPlainNumber, formatSchedule, formatTime, scheduledHours, sessionCount } from "../lib/format";
import { Modal } from "./Modal";

export function QuickViewModal({ course, onClose, onEdit, onOffer }: { course: Course | null; onClose: () => void; onEdit: (id: string) => void; onOffer: (id: string) => void }) {
  if (!course) return null;
  const sessions = sessionCount(course);
  const hours = scheduledHours(course);
  const facts: Array<[string, string]> = [
    ["Course ID", course.id],
    ["Subject", course.subject],
    ["Rate type", course.rateType],
    ["Product", course.productType],
    ["Dates", `${formatLongDate(course.startDate)} to ${formatLongDate(course.endDate)}`],
    ["Days", formatDays(course.daysOfWeek)],
    ["Time", formatTime(course.time, true)],
    ["Schedule", formatSchedule(course)],
    ["Duration", `${formatPlainNumber(course.duration)} hour(s)`],
    ["Sessions", String(sessions)],
    ["Scheduled hours", `${formatPlainNumber(hours)} (duration × meeting dates)`],
    ["Rate", `$${formatMoney(course.rate)}/hr`],
    ["Status", course.status],
    ["Working on it", course.workingOnIt ? "Yes" : "No"],
    ["Instructor", course.instructorName ? `${course.instructorName} · ${course.instructorEmail}` : "Unassigned"],
  ];

  return (
    <Modal title={course.name} onClose={onClose} wide testId="quick-view">
      <dl className="grid gap-3 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
            <dd className="text-sm text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Note title="Internal notes" body={course.internalNotes} />
        <Note title="Note to courses team" body={course.noteToCoursesTeam} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {course.clientUrl ? (
          <a className="font-medium text-indigo-700 hover:underline" href={course.clientUrl} target="_blank" rel="noreferrer">
            Client page
          </a>
        ) : (
          <span className="text-slate-400">No client page</span>
        )}
        {course.catalogUrl ? (
          <a className="font-medium text-indigo-700 hover:underline" href={course.catalogUrl} target="_blank" rel="noreferrer">
            Catalog
          </a>
        ) : (
          <span className="text-slate-400">No catalog link</span>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium" onClick={() => onOffer(course.id)}>
          Send Offer Email
        </button>
        <button type="button" className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={() => onEdit(course.id)}>
          Edit record
        </button>
      </div>
    </Modal>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-md bg-slate-50 p-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      <p className="mt-1 text-sm whitespace-pre-wrap text-slate-800">{body || "None"}</p>
    </section>
  );
}
