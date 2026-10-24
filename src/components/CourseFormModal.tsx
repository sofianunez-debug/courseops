import { useEffect, useState, type ReactNode } from "react";
import { COURSE_STATUSES, PRODUCT_TYPES, RATE_TYPES, WEEKDAYS, type Course, type CourseStatus, type ProductType, type RateType } from "../types";
import { newCourseId } from "../lib/format";
import { isEmail, isHttpUrl } from "../lib/model";
import { Modal } from "./Modal";

const EMPTY: Course = {
  id: "",
  name: "",
  subject: "",
  rateType: "Test Prep",
  productType: "Livestream",
  startDate: "",
  endDate: "",
  daysOfWeek: [],
  time: "19:00:00",
  duration: 1.5,
  rate: 100,
  instructorName: null,
  instructorEmail: null,
  status: "Available",
  workingOnIt: false,
  clientUrl: "",
  catalogUrl: "",
  internalNotes: "",
  noteToCoursesTeam: "",
};

export function CourseFormModal({
  open,
  course,
  onClose,
  onSave,
}: {
  open: boolean;
  course: Course | null;
  onClose: () => void;
  onSave: (course: Course) => void;
}) {
  const [draft, setDraft] = useState<Course>(EMPTY);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setDraft(course ? { ...course, daysOfWeek: [...course.daysOfWeek] } : { ...EMPTY, id: newCourseId(), daysOfWeek: [] });
  }, [open, course]);

  if (!open) return null;

  function update(patch: Partial<Course>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function toggleDay(day: string) {
    setDraft((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day) ? current.daysOfWeek.filter((item) => item !== day) : [...current.daysOfWeek, day],
    }));
  }

  function save() {
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      subject: draft.subject.trim(),
      instructorName: draft.instructorName?.trim() || null,
      instructorEmail: draft.instructorEmail?.trim() || null,
      clientUrl: draft.clientUrl.trim(),
      catalogUrl: draft.catalogUrl.trim(),
      internalNotes: draft.internalNotes.trim(),
      noteToCoursesTeam: draft.noteToCoursesTeam.trim(),
    });
  }

  return (
    <Modal title={course ? "Edit course" : "Add course"} onClose={onClose} wide testId="course-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Course ID">
          <input className={inputClass} value={draft.id} readOnly />
        </Field>
        <Field label="Course name">
          <input className={inputClass} value={draft.name} data-testid="form-name" onChange={(event) => update({ name: event.target.value })} />
        </Field>
        <Field label="Placement subject">
          <input className={inputClass} value={draft.subject} data-testid="form-subject" onChange={(event) => update({ subject: event.target.value })} />
        </Field>
        <Field label="Rate type">
          <select className={inputClass} value={draft.rateType} onChange={(event) => update({ rateType: event.target.value as RateType })}>
            {RATE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Product / delivery type">
          <select className={inputClass} value={draft.productType} onChange={(event) => update({ productType: event.target.value as ProductType })}>
            {PRODUCT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={draft.status} onChange={(event) => update({ status: event.target.value as CourseStatus })}>
            {COURSE_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" className={inputClass} value={draft.startDate} data-testid="form-start" onChange={(event) => update({ startDate: event.target.value })} />
        </Field>
        <Field label="End date">
          <input type="date" className={inputClass} value={draft.endDate} data-testid="form-end" onChange={(event) => update({ endDate: event.target.value })} />
        </Field>
        <Field label="Time (Central)">
          <input
            type="time"
            className={inputClass}
            value={draft.time.slice(0, 5)}
            onChange={(event) => update({ time: event.target.value ? `${event.target.value}:00` : "" })}
          />
        </Field>
        <Field label="Duration (hours)">
          <input
            type="number"
            min="0.25"
            step="0.25"
            className={inputClass}
            value={draft.duration}
            onChange={(event) => update({ duration: Number(event.target.value) })}
          />
        </Field>
        <Field label="Rate ($/hr)">
          <input type="number" min="0" step="1" className={inputClass} value={draft.rate} onChange={(event) => update({ rate: Number(event.target.value) })} />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-semibold text-slate-600">Days of week</legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const on = draft.daysOfWeek.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${on ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"}`}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">{draft.daysOfWeek.length ? draft.daysOfWeek.join(", ") : "Select at least one day."}</p>
        </fieldset>
        <Field label="Instructor name">
          <input className={inputClass} value={draft.instructorName ?? ""} onChange={(event) => update({ instructorName: event.target.value || null })} />
        </Field>
        <Field label="Instructor email">
          <input className={inputClass} value={draft.instructorEmail ?? ""} onChange={(event) => update({ instructorEmail: event.target.value || null })} />
        </Field>
        <Field label="Client URL">
          <input className={inputClass} value={draft.clientUrl} onChange={(event) => update({ clientUrl: event.target.value })} />
        </Field>
        <Field label="Item catalog URL">
          <input className={inputClass} value={draft.catalogUrl} onChange={(event) => update({ catalogUrl: event.target.value })} />
        </Field>
        <Field label="Internal notes">
          <textarea className={`${inputClass} min-h-20`} value={draft.internalNotes} onChange={(event) => update({ internalNotes: event.target.value })} />
        </Field>
        <Field label="Note to courses team">
          <textarea className={`${inputClass} min-h-20`} value={draft.noteToCoursesTeam} onChange={(event) => update({ noteToCoursesTeam: event.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={draft.workingOnIt} onChange={(event) => update({ workingOnIt: event.target.checked })} />
          Working on it
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-amber-800">{error}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white" data-testid="form-save" onClick={save}>
          Save course
        </button>
      </div>
    </Modal>
  );
}

const inputClass = "mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      {children}
    </label>
  );
}

function validate(course: Course): string | null {
  if (!course.name.trim()) return "Course name is required.";
  if (!course.subject.trim()) return "Placement subject is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(course.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(course.endDate)) return "Start and end dates are required.";
  if (course.endDate < course.startDate) return "End date is before the start date.";
  if (course.daysOfWeek.length === 0) return "Select at least one meeting day.";
  if (!/^\d{2}:\d{2}:\d{2}$/.test(course.time)) return "Time is required.";
  if (!Number.isFinite(course.duration) || course.duration <= 0 || course.duration > 12) return "Duration must be between 0 and 12 hours.";
  if (!Number.isFinite(course.rate) || course.rate < 0) return "Rate must be zero or more.";
  const instructorName = course.instructorName?.trim() ?? "";
  const instructorEmail = course.instructorEmail?.trim() ?? "";
  if ((instructorName && !instructorEmail) || (!instructorName && instructorEmail)) return "Instructor name and email go together.";
  if (instructorEmail && !isEmail(instructorEmail)) return "Instructor email is not valid.";
  if (!isHttpUrl(course.clientUrl) || !isHttpUrl(course.catalogUrl)) return "Links must start with http:// or https://.";
  return null;
}
