import type { Course, ProductType, RateType } from "../types";
import { newCourseId } from "./format";
import { inferRateType } from "./model";

export interface ParsedCsvRow {
  line: number;
  course: Course | null;
  error: string | null;
  preview: {
    name: string;
    startDate: string;
    endDate: string;
    days: string;
    time: string;
    subject: string;
    productType: string;
    rate: string;
  };
}

export interface ParsedCsv {
  delimiter: "\t" | ",";
  rows: ParsedCsvRow[];
}

const HEADER_FIELDS = {
  "course name": "name",
  "class name": "name",
  name: "name",
  title: "name",
  "start date": "startDate",
  start: "startDate",
  "end date": "endDate",
  end: "endDate",
  day: "days",
  days: "days",
  "day s": "days",
  "days of week": "days",
  "meeting days": "days",
  time: "time",
  "start time": "time",
  "meeting time": "time",
  duration: "duration",
  "duration hours": "duration",
  hours: "duration",
  subject: "subject",
  "placement subject": "subject",
  "product type": "productType",
  product: "productType",
  "delivery type": "productType",
  rate: "rate",
  "hourly rate": "rate",
  "rate hr": "rate",
  "rate type": "rateType",
  "program category": "rateType",
} as const;

type CsvField = (typeof HEADER_FIELDS)[keyof typeof HEADER_FIELDS];

const DAY_ALIASES: Record<string, string> = {
  su: "Sun",
  sun: "Sun",
  sunday: "Sun",
  mo: "Mon",
  mon: "Mon",
  monday: "Mon",
  tu: "Tue",
  tue: "Tue",
  tues: "Tue",
  tuesday: "Tue",
  we: "Wed",
  wed: "Wed",
  wednesday: "Wed",
  th: "Thu",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fr: "Fri",
  fri: "Fri",
  friday: "Fri",
  sa: "Sat",
  sat: "Sat",
  saturday: "Sat",
};

export const SAMPLE_CSV = `Course Name,Start Date,End Date,Day(s),Time,Duration,Subject,Product Type,Rate
ACT Science Sprint,2027-04-06,2027-04-29,"Tue, Thu",6:00 PM,1.5,Science,Livestream,90
PMP Agile Lab,2027-08-03,2027-08-26,Wed,19:00:00,2,PMP,Small Group,115
Algebra Midweek Studio,2027-01-20,2027-02-24,"Mon, Wed",4:30 PM,1,Algebra,Small Group,75
`;

export function parseCsv(text: string): ParsedCsv {
  const delimiter = detectDelimiter(text);
  const table = parseDelimited(text, delimiter);
  if (table.length === 0) return { delimiter, rows: [] };
  const fields = table[0].map(headerField);
  const rows = table.slice(1).map((cells, index) => buildRow(cells, fields, index + 2));
  return { delimiter, rows };
}

export function courseKey(course: Pick<Course, "name" | "startDate" | "time" | "productType">): string {
  return [course.name.trim().toLowerCase(), course.startDate, course.time, course.productType].join("|");
}

export function mergeCourses(existing: Course[], incoming: Course[]): { courses: Course[]; added: Course[] } {
  const seen = new Set(existing.map(courseKey));
  const added: Course[] = [];
  for (const course of incoming) {
    const key = courseKey(course);
    if (seen.has(key)) continue;
    seen.add(key);
    added.push(course);
  }
  return { courses: [...existing, ...added], added };
}

function detectDelimiter(text: string): "\t" | "," {
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const tabs = first.split("\t").length - 1;
  const commas = first.split(",").length - 1;
  return tabs > commas ? "\t" : ",";
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((item) => item.trim())) rows.push(row);
  }
  return rows;
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\(s\)/g, "s")
    .replace(/[$/]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headerField(header: string): CsvField | null {
  return HEADER_FIELDS[normalizeHeader(header) as keyof typeof HEADER_FIELDS] ?? null;
}

function buildRow(cells: string[], fields: Array<CsvField | null>, line: number): ParsedCsvRow {
  const values: Partial<Record<CsvField, string>> = {};
  fields.forEach((field, index) => {
    if (!field || values[field]) return;
    values[field] = cells[index]?.trim() ?? "";
  });
  const preview = {
    name: values.name ?? "",
    startDate: values.startDate ?? "",
    endDate: values.endDate ?? "",
    days: values.days ?? "",
    time: values.time ?? "",
    subject: values.subject ?? "",
    productType: values.productType ?? "",
    rate: values.rate ?? "",
  };
  const problem = validate(values);
  if (problem) return { line, course: null, error: problem, preview };
  const days = parseDays(values.days ?? "");
  const startDate = parseDate(values.startDate ?? "");
  const endDate = parseDate(values.endDate ?? "");
  const time = parseTime(values.time ?? "");
  const duration = parseDuration(values.duration ?? "");
  const rate = parseRate(values.rate ?? "");
  const productType = parseProduct(values.productType ?? "");
  if (!days || !startDate || !endDate || !time || duration == null || rate == null || !productType) {
    return { line, course: null, error: "A date, time, day, duration, rate, or product type could not be read.", preview };
  }
  if (endDate < startDate) return { line, course: null, error: "End date is before the start date.", preview };
  const subject = values.subject!.trim();
  const course: Course = {
    id: newCourseId(),
    name: values.name!.trim(),
    subject,
    rateType: parseRateType(values.rateType ?? "", subject),
    productType,
    startDate,
    endDate,
    daysOfWeek: days,
    time,
    duration,
    rate,
    instructorName: null,
    instructorEmail: null,
    status: "Available",
    workingOnIt: false,
    clientUrl: "",
    catalogUrl: "",
    internalNotes: "",
    noteToCoursesTeam: "",
  };
  return { line, course, error: null, preview };
}

function validate(values: Partial<Record<CsvField, string>>): string | null {
  if (!values.name?.trim()) return "Course name is required.";
  if (!values.subject?.trim()) return "Subject is required.";
  if (!values.startDate?.trim() || !values.endDate?.trim()) return "Start and end dates are required.";
  if (!values.days?.trim()) return "Days are required.";
  if (!values.time?.trim()) return "Time is required.";
  if (!values.duration?.trim()) return "Duration is required.";
  if (!values.productType?.trim()) return "Product type is required.";
  if (!values.rate?.trim()) return "Rate is required.";
  return null;
}

export function parseDays(value: string): string[] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[,\s/|&]/.test(trimmed) || /\band\b/i.test(trimmed)) {
    const parts = trimmed
      .split(/\s*(?:,|\/|\||&|\band\b)\s*/i)
      .flatMap((part) => (part.includes(" ") && !DAY_ALIASES[part.toLowerCase()] ? part.split(/\s+/) : [part]));
    const days = dedupeDays(parts.map(dayToken).filter((day): day is string => Boolean(day)));
    return days.length ? days : null;
  }
  const direct = dayToken(trimmed);
  if (direct) return [direct];
  return parseCompactDays(trimmed);
}

function dedupeDays(days: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const day of days) {
    if (seen.has(day)) continue;
    seen.add(day);
    unique.push(day);
  }
  return unique;
}

function dayToken(value: string): string | null {
  return DAY_ALIASES[value.trim().toLowerCase()] ?? null;
}

function parseCompactDays(value: string): string[] | null {
  if (!/^[A-Za-z]{2,10}$/.test(value)) return null;
  const lower = value.toLowerCase();
  const days: string[] = [];
  let index = 0;
  while (index < lower.length) {
    const two = lower.slice(index, index + 2);
    const pair: Record<string, string> = {
      th: "Thu",
      tu: "Tue",
      su: "Sun",
      sa: "Sat",
      we: "Wed",
      mo: "Mon",
      fr: "Fri",
    };
    if (pair[two]) {
      days.push(pair[two]);
      index += 2;
      continue;
    }
    const one: Record<string, string> = { m: "Mon", w: "Wed", f: "Fri", t: "Tue", s: "Sat" };
    const day = one[lower[index] ?? ""];
    if (!day) return null;
    days.push(day);
    index += 1;
  }
  return dedupeDays(days);
}

export function parseDate(value: string): string | null {
  const trimmed = value.trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (match) return iso(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (match) return iso(Number(match[3]), Number(match[1]), Number(match[2]));
  match = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(trimmed);
  if (match) {
    const month = monthNumber(match[1]);
    if (!month) return null;
    return iso(Number(match[3]), month, Number(match[2]));
  }
  return null;
}

function monthNumber(name: string): number | null {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const index = months.findIndex((month) => name.toLowerCase().startsWith(month));
  return index >= 0 ? index + 1 : null;
}

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function parseTime(value: string): string | null {
  const raw = value
    .trim()
    .toLowerCase()
    .replace(/\b(ct|cst|cdt|central)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*([ap]m)?$/.exec(raw);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const seconds = Number(match[3] ?? "0");
  const suffix = match[4];
  if (minutes > 59 || seconds > 59) return null;
  if (suffix) {
    if (hours < 1 || hours > 12) return null;
    if (suffix === "pm" && hours !== 12) hours += 12;
    if (suffix === "am" && hours === 12) hours = 0;
  } else if (hours > 23) return null;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

/**
 * Duration is hours. Values written as minutes ("90 min", or a bare number above 8)
 * are converted to hours so a Sheets export of 90 still imports as 1.5.
 */
export function parseDuration(value: string): number | null {
  const raw = value.trim().toLowerCase();
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 600) return null;
  const hours = /min/.test(raw) || amount > 8 ? amount / 60 : amount;
  return Math.round(hours * 100) / 100;
}

function parseRate(value: string): number | null {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const rate = Number(match[1]);
  if (!Number.isFinite(rate) || rate < 0) return null;
  return Math.round(rate * 100) / 100;
}

function parseProduct(value: string): ProductType | null {
  const raw = value.trim().toLowerCase();
  if (/small/.test(raw) || raw === "sg") return "Small Group";
  if (/live/.test(raw) || raw === "ls") return "Livestream";
  return null;
}

function parseRateType(value: string, subject: string): RateType {
  const raw = value.trim().toLowerCase();
  if (raw === "test prep" || raw === "testprep") return "Test Prep";
  if (raw === "academic") return "Academic";
  if (/professional|certification|cert/.test(raw)) return "Professional Certification";
  return inferRateType(subject);
}
