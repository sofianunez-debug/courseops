import { useEffect, useRef, type ReactNode } from "react";
import { Bookmark, ExternalLink, Eye, Mail, Pencil, Trash2, UserPlus } from "lucide-react";
import type { Course, CourseStatus, Instructor } from "../types";
import { COURSE_STATUSES } from "../types";
import { formatMoney, formatPlainNumber, formatSchedule, sessionCount } from "../lib/format";
import { suggestInstructors } from "../lib/schedule";

const STATUS_CLASS: Record<CourseStatus, string> = {
  Available: "bg-amber-100 text-amber-950",
  "Waiting for response": "bg-indigo-100 text-indigo-950",
  Assigned: "bg-emerald-100 text-emerald-950",
  Ended: "bg-slate-200 text-slate-700",
  Cancelled: "bg-slate-800 text-white",
};

const RATE_CLASS = {
  "Test Prep": "bg-indigo-50 text-indigo-800 ring-indigo-200",
  Academic: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "Professional Certification": "bg-amber-50 text-amber-900 ring-amber-200",
} as const;

export function RosterTable({
  courses,
  instructors,
  roster,
  selected,
  onToggle,
  onToggleAll,
  onBookmark,
  onStatus,
  onOffer,
  onView,
  onEdit,
  onDelete,
  emptyBecauseFilters,
  onResetFilters,
}: {
  courses: Course[];
  instructors: Instructor[];
  roster: Course[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onBookmark: (id: string) => void;
  onStatus: (id: string, status: CourseStatus) => void;
  onOffer: (ids: string[], instructor?: Instructor) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  emptyBecauseFilters: boolean;
  onResetFilters: () => void;
}) {
  const allChecked = courses.length > 0 && courses.every((course) => selected.includes(course.id));
  const someChecked = courses.some((course) => selected.includes(course.id));
  const headerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someChecked && !allChecked;
  }, [someChecked, allChecked]);

  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center" data-testid="roster-empty">
        <p className="text-sm font-medium text-slate-800">
          {emptyBecauseFilters ? "No courses match these filters." : "No courses on the roster."}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {emptyBecauseFilters ? "Reset the filters or turn ended courses back on." : "Add a course or import a CSV."}
        </p>
        {emptyBecauseFilters ? (
          <button type="button" className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium" onClick={onResetFilters}>
            Reset Filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1480px] w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2">
              <input
                ref={headerRef}
                type="checkbox"
                aria-label="Select all visible courses"
                checked={allChecked}
                onChange={(event) => onToggleAll(event.target.checked)}
                data-testid="select-all"
              />
            </th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Course</th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Rate type</th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Schedule & dates</th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Instructor</th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Suggested tutors</th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Status</th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Rate</th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Links</th>
            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => {
            const suggestions = suggestInstructors(course, instructors, roster);
            const sessions = sessionCount(course);
            return (
              <tr key={course.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80" data-testid="course-row" data-course-id={course.id}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${course.name}`}
                    checked={selected.includes(course.id)}
                    onChange={(event) => onToggle(course.id, event.target.checked)}
                  />
                </td>
                <td className="min-w-56 px-3 py-2">
                  <div className="flex items-start gap-1.5">
                    <button
                      type="button"
                      className={`mt-0.5 rounded p-0.5 ${course.workingOnIt ? "text-amber-600" : "text-slate-300 hover:text-amber-500"}`}
                      aria-pressed={course.workingOnIt}
                      aria-label={course.workingOnIt ? `Remove working bookmark from ${course.name}` : `Bookmark ${course.name} as working on it`}
                      data-testid={`bookmark-${course.id}`}
                      onClick={() => onBookmark(course.id)}
                    >
                      <Bookmark size={15} fill={course.workingOnIt ? "currentColor" : "none"} />
                    </button>
                    <div>
                      <p className="font-semibold text-slate-900">{course.name}</p>
                      <p className="text-xs text-slate-500">
                        {course.subject} · <span className="font-mono">{course.id}</span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${RATE_CLASS[course.rateType]}`}>{course.rateType}</span>
                  <p className="mt-1 text-xs text-slate-500">{course.productType}</p>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <p>{formatSchedule(course)}</p>
                  <p className="text-xs text-slate-500">
                    {formatPlainNumber(course.duration)} hr × {sessions} session{sessions === 1 ? "" : "s"}
                  </p>
                </td>
                <td className="min-w-40 px-3 py-2">
                  {course.instructorName ? (
                    <div>
                      <p className="font-medium text-slate-900">{course.instructorName}</p>
                      <p className="text-xs text-slate-500">{course.instructorEmail}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline" onClick={() => onOffer([course.id])}>
                        <UserPlus size={13} /> Assign
                      </button>
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline" onClick={() => onOffer([course.id])} data-testid={`offer-${course.id}`}>
                        <Mail size={13} /> Offer
                      </button>
                    </div>
                  )}
                </td>
                <td className="min-w-64 px-3 py-2">
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-slate-400">No greenlit match</p>
                  ) : (
                    <ul className="max-h-28 space-y-1.5 overflow-auto">
                      {suggestions.map((instructor) => (
                        <li key={instructor.email} className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium text-slate-800">{instructor.name}</span>
                            <span className="block truncate text-[11px] text-slate-500">{instructor.email}</span>
                          </span>
                          <button
                            type="button"
                            className="shrink-0 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-800"
                            onClick={() => onOffer([course.id], instructor)}
                            data-testid={`suggest-offer-${course.id}-${instructor.email}`}
                          >
                            Offer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-2">
                  <label className="sr-only" htmlFor={`status-${course.id}`}>
                    Status for {course.name}
                  </label>
                  <select
                    id={`status-${course.id}`}
                    className={`rounded-md border-0 px-2 py-1 text-xs font-semibold ${STATUS_CLASS[course.status]}`}
                    value={course.status}
                    data-testid={`status-${course.id}`}
                    onChange={(event) => onStatus(course.id, event.target.value as CourseStatus)}
                  >
                    {COURSE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 font-medium tabular-nums whitespace-nowrap">${formatMoney(course.rate)}/hr</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex flex-col gap-1 text-xs font-medium">
                    <ExternalAnchor href={course.clientUrl} label="Client page" />
                    <ExternalAnchor href={course.catalogUrl} label="Catalog" />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <IconButton label={`Send offer email for ${course.name}`} onClick={() => onOffer([course.id])} testId={`action-offer-${course.id}`}>
                      <Mail size={14} />
                    </IconButton>
                    <IconButton label={`Quick view ${course.name}`} onClick={() => onView(course.id)} testId={`action-view-${course.id}`}>
                      <Eye size={14} />
                    </IconButton>
                    <IconButton label={`Edit ${course.name}`} onClick={() => onEdit(course.id)} testId={`action-edit-${course.id}`}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton label={`Delete ${course.name}`} onClick={() => onDelete(course.id)} testId={`action-delete-${course.id}`}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExternalAnchor({ href, label }: { href: string; label: string }) {
  if (!href) return <span className="text-slate-300">{label}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-700 hover:underline">
      {label} <ExternalLink size={11} />
    </a>
  );
}

function IconButton({ label, onClick, children, testId }: { label: string; onClick: () => void; children: ReactNode; testId?: string }) {
  return (
    <button type="button" title={label} aria-label={label} data-testid={testId} className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100" onClick={onClick}>
      {children}
    </button>
  );
}
