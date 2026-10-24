import type { Course } from "../types";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso || "—";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDays(days: string[]): string {
  return days.map((day) => day.trim()).filter(Boolean).join(", ");
}

export function formatTime(value: string, withZone = false): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value || "—";
  let hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const clock = `${hours}:${minutes} ${suffix}`;
  return withZone ? `${clock} CT` : clock;
}

export function formatSchedule(course: Pick<Course, "startDate" | "endDate" | "daysOfWeek" | "time">): string {
  return `${formatLongDate(course.startDate)} to ${formatLongDate(course.endDate)} • ${formatDays(course.daysOfWeek)} • ${formatTime(course.time, true)}`;
}

export function formatPlainNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function newCourseId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  let suffix = "";
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
  return `GC-${suffix}`;
}

function parseIsoUtc(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sessionCount(course: Pick<Course, "startDate" | "endDate" | "daysOfWeek">): number {
  const start = parseIsoUtc(course.startDate);
  const end = parseIsoUtc(course.endDate);
  if (!start || !end || end.getTime() < start.getTime()) return 0;
  const days = new Set(
    course.daysOfWeek
      .map((day) => WEEKDAY_INDEX[day.trim()])
      .filter((day): day is number => day !== undefined),
  );
  if (days.size === 0) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    if (days.has(cursor.getUTCDay())) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Scheduled teaching hours for a course.
 * Hours = duration × session count. Session count is the number of dates from
 * the start date through the end date (inclusive) whose weekday is one of the
 * course's meeting days. A Mon/Wed class is not one block of `duration` hours.
 */
export function scheduledHours(course: Pick<Course, "startDate" | "endDate" | "daysOfWeek" | "duration">): number {
  const sessions = sessionCount(course);
  if (sessions === 0) return 0;
  return Math.round(course.duration * sessions * 100) / 100;
}

export function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
