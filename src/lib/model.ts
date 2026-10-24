import {
  COURSE_STATUSES,
  PRODUCT_TYPES,
  RATE_TYPES,
  type Course,
  type CourseStatus,
  type Instructor,
  type ProductType,
  type RateType,
} from "../types";

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function asStatus(value: unknown): CourseStatus {
  const raw = text(value);
  return COURSE_STATUSES.find((status) => status.toLowerCase() === raw.toLowerCase()) ?? "Available";
}

function asRateType(value: unknown, subject: string): RateType {
  const raw = text(value).toLowerCase();
  const match = RATE_TYPES.find((type) => type.toLowerCase() === raw);
  if (match) return match;
  if (/cert|pmp|cpa|cfa|shrm/.test(raw)) return "Professional Certification";
  if (/academic/.test(raw)) return "Academic";
  if (/test/.test(raw)) return "Test Prep";
  return inferRateType(subject);
}

export function inferRateType(subject: string): RateType {
  const raw = subject.toLowerCase();
  if (/\b(sat|act|gre|gmat|mcat|lsat|ap)\b/.test(raw)) return "Test Prep";
  if (/pmp|cpa|cfa|shrm|certification/.test(raw)) return "Professional Certification";
  return "Academic";
}

function asProduct(value: unknown): ProductType | null {
  const raw = text(value).toLowerCase();
  if (!raw) return null;
  if (/small/.test(raw) || raw === "sg") return "Small Group";
  if (/live/.test(raw) || raw === "ls") return "Livestream";
  return PRODUCT_TYPES.find((type) => type.toLowerCase() === raw) ?? null;
}

export function normalizeCourse(input: unknown): Course | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const name = text(row.name ?? row.course_name ?? row.courseName);
  const subject = text(row.subject ?? row.placement_subject ?? row.placementSubject);
  if (!name || !subject) return null;
  const productType = asProduct(row.productType ?? row.product_type ?? row.delivery_type);
  const startDate = text(row.startDate ?? row.start_date);
  const endDate = text(row.endDate ?? row.end_date);
  const time = text(row.time);
  const duration = Number(row.duration);
  const rate = Number(row.rate);
  if (!productType || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return null;
  if (!/^\d{2}:\d{2}:\d{2}$/.test(time) || !Number.isFinite(duration) || !Number.isFinite(rate)) return null;
  const instructorName = text(row.instructorName ?? row.instructor_name);
  const instructorEmail = text(row.instructorEmail ?? row.instructor_email);
  return {
    id: text(row.id ?? row.course_id) || "GC-UNSET",
    name,
    subject,
    rateType: asRateType(row.rateType ?? row.rate_type, subject),
    productType,
    startDate,
    endDate,
    daysOfWeek: stringList(row.daysOfWeek ?? row.days_of_week),
    time,
    duration,
    rate,
    instructorName: instructorName || null,
    instructorEmail: instructorEmail || null,
    status: asStatus(row.status),
    workingOnIt: Boolean(row.workingOnIt ?? row.working_on_it),
    clientUrl: text(row.clientUrl ?? row.client_url),
    catalogUrl: text(row.catalogUrl ?? row.catalog_url),
    internalNotes: text(row.internalNotes ?? row.internal_notes),
    noteToCoursesTeam: text(row.noteToCoursesTeam ?? row.note_to_courses_team),
  };
}

export function normalizeInstructor(input: unknown): Instructor | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const name = text(row.name);
  const email = text(row.email);
  if (!name || !email) return null;
  const count = Number(row.historicalTeachingCount ?? row.historical_teaching_count ?? 0);
  return {
    name,
    email,
    qualifiedSubjects: stringList(row.qualifiedSubjects ?? row.qualified_subjects),
    taughtSubjects: stringList(row.taughtSubjects ?? row.taught_subjects),
    greenlit: Boolean(row.greenlit),
    historicalTeachingCount: Number.isFinite(count) ? count : 0,
  };
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  return /^https?:\/\/\S+$/i.test(value.trim());
}
