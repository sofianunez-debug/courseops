import { useEffect, useMemo, useRef, useState } from "react";
import type { Course, Instructor } from "../types";
import { mailtoHref, offerBody, offerSubject, openMailto } from "../lib/email";
import { formatSchedule } from "../lib/format";
import { isEmail } from "../lib/model";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

export function OfferModal({
  open,
  courseIds,
  instructor,
  courses,
  instructors,
  onClose,
  onCommit,
}: {
  open: boolean;
  courseIds: string[];
  instructor?: Instructor;
  courses: Course[];
  instructors: Instructor[];
  onClose: () => void;
  onCommit: (ids: string[], tutor: { name: string; email: string }, status: "Waiting for response" | "Assigned") => void;
}) {
  const toast = useToast();
  const wasOpen = useRef(false);
  const [ids, setIds] = useState<string[]>(courseIds);
  const [name, setName] = useState(instructor?.name ?? "");
  const [email, setEmail] = useState(instructor?.email ?? "");

  useEffect(() => {
    if (open && !wasOpen.current) {
      setIds(courseIds);
      setName(instructor?.name ?? "");
      setEmail(instructor?.email ?? "");
    }
    wasOpen.current = open;
  }, [open, courseIds, instructor]);

  const bundled = useMemo(() => ids.map((id) => courses.find((course) => course.id === id)).filter((course): course is Course => Boolean(course)), [ids, courses]);
  const subject = offerSubject(bundled);
  const body = offerBody(name || "there", bundled);
  const remaining = courses.filter((course) => !ids.includes(course.id) && course.status !== "Ended" && course.status !== "Cancelled");

  if (!open) return null;

  function selectedTutor(): { name: string; email: string } | null {
    const tutorName = name.trim();
    const tutorEmail = email.trim();
    if (!tutorName || !isEmail(tutorEmail)) return null;
    return { name: tutorName, email: tutorEmail };
  }

  function requireReady(): { name: string; email: string } | null {
    if (bundled.length === 0) {
      toast("Add at least one course before sending.", "error");
      return null;
    }
    const tutor = selectedTutor();
    if (!tutor) {
      toast("Enter the tutor's name and a valid email.", "error");
      return null;
    }
    return tutor;
  }

  return (
    <Modal title={bundled.length > 1 ? "Offer multiple courses" : "Offer course"} onClose={onClose} wide testId="offer-modal">
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600">
            Tutor directory
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={instructors.some((person) => person.email === email) ? email : ""}
              data-testid="offer-tutor-select"
              onChange={(event) => {
                const next = instructors.find((person) => person.email === event.target.value);
                if (!next) return;
                setName(next.name);
                setEmail(next.email);
              }}
            >
              <option value="">Select a tutor</option>
              {instructors.map((person) => (
                <option key={person.email} value={person.email}>
                  {person.name} · {person.email}
                  {person.greenlit ? "" : " · not greenlit"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Name
            <input className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={name} data-testid="offer-name" onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Email
            <input className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={email} data-testid="offer-email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Add a course
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value=""
              data-testid="offer-add-course"
              onChange={(event) => {
                const id = event.target.value;
                if (id) setIds((current) => [...current, id]);
              }}
            >
              <option value="">Choose a course</option>
              {remaining.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <ul className="max-h-48 space-y-1 overflow-auto">
            {bundled.map((course) => (
              <li key={course.id} className="rounded border border-slate-200 px-2 py-1.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-800">{course.name}</span>
                  <button type="button" className="text-slate-500 hover:text-slate-900" onClick={() => setIds((current) => current.filter((id) => id !== course.id))}>
                    Remove
                  </button>
                </div>
                <p className="text-slate-500">{formatSchedule(course)}</p>
              </li>
            ))}
            {bundled.length === 0 ? <li className="text-xs text-slate-500">No courses in this offer.</li> : null}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Subject</p>
          <p className="mt-1 text-sm font-medium text-slate-900" data-testid="offer-subject">
            {bundled.length ? subject : "Add a course to build the subject."}
          </p>
          <p className="mt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Body</p>
          <pre className="mt-1 max-h-80 overflow-auto rounded-md bg-slate-50 p-3 text-xs leading-5 whitespace-pre-wrap text-slate-800" data-testid="offer-body">
            {bundled.length ? body : ""}
          </pre>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
          data-testid="offer-mailto"
          onClick={() => {
            const tutor = requireReady();
            if (!tutor) return;
            const href = mailtoHref(tutor.email, subject, body);
            openMailto(tutor.email, subject, body);
            toast(
              href.length > 1800
                ? "Opened the mail client. This message is long and some clients truncate it. Copy Email is the backup."
                : "Opened the mail client with the offer addressed to the tutor.",
            );
          }}
        >
          Send via Gmail / Mailto
        </button>
        <button
          type="button"
          className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-900"
          data-testid="offer-copy"
          onClick={() => {
            const tutor = requireReady();
            if (!tutor) return;
            const payload = `Subject: ${subject}\n\n${body}`;
            navigator.clipboard.writeText(payload).then(
              () => {
                onCommit(bundled.map((course) => course.id), tutor, "Waiting for response");
                toast("Email copied. Courses marked Waiting for response.");
              },
              () => toast("Could not copy to the clipboard. Select the preview and copy it manually.", "error"),
            );
          }}
        >
          Copy Email & Mark Waiting
        </button>
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white"
          data-testid="offer-assign"
          onClick={() => {
            const tutor = requireReady();
            if (!tutor) return;
            onCommit(bundled.map((course) => course.id), tutor, "Assigned");
            toast("Courses assigned to the tutor.");
          }}
        >
          Direct Assign / Confirm
        </button>
      </div>
    </Modal>
  );
}
