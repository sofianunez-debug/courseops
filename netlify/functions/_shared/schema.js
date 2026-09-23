export const CANONICAL = {
  working: [
    "Class Name",
    "Schedule",
    "Start Date",
    "Days Until Start",
    "Duration",
    "Subject",
    "Tutor Name",
    "Tutor Email",
    "Status",
    "Notes",
  ],
  subs: ["Class Name", "Date", "Time", "Duration", "Status", "Note"],
  instructors: ["Tutor Name", "Tutor Email", "Subjects", "ICA Status"],
  activity: ["Timestamp", "Action", "Status", "Recipient", "Detail", "Error"],
};

export const STATUS = {
  offer: "Offer",
  waiting: "Waiting for response",
  accepted: "Accepted",
  notInProgress: "Not in progress",
  declined: "Declined",
  available: "Available",
};

const HEADER_FIELDS = {
  "class name": "className",
  "course name": "className",
  schedule: "schedule",
  "meeting time": "schedule",
  "start date": "startDate",
  "days until start": "daysUntilStart",
  "days to start": "daysUntilStart",
  duration: "duration",
  subject: "subject",
  subjects: "subjects",
  "tutor name": "tutorName",
  "instructor name": "tutorName",
  "tutor email": "email",
  "instructor email": "email",
  email: "email",
  "e mail": "email",
  status: "status",
  "offer status": "status",
  notes: "note",
  note: "note",
  date: "date",
  "session date": "date",
  time: "time",
  "session time": "time",
  "ica status": "icaStatus",
  timestamp: "timestamp",
  action: "action",
  recipient: "recipient",
  detail: "detail",
  error: "error",
};

export function normalizeHeader(header) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function headerToField(header) {
  return HEADER_FIELDS[normalizeHeader(header)] || null;
}

export function columnLetter(index) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function quoteTab(name) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

export function columnsFor(headers) {
  const columns = {};
  headers.forEach((header, index) => {
    const field = headerToField(header);
    if (field && !columns[field]) columns[field] = columnLetter(index);
  });
  return columns;
}

export function missingFields(columns, fields) {
  return fields.filter((field) => !columns[field]);
}

export function normalizeRecords(headers, rows) {
  const fields = headers.map((header) => headerToField(header));
  const columns = columnsFor(headers);
  const records = [];
  rows.forEach((row, index) => {
    const record = { _rowNumber: index + 2, _columns: columns };
    const seen = new Set();
    let any = false;
    fields.forEach((field, cell) => {
      const value = row[cell] == null ? "" : String(row[cell]).trim();
      if (value) any = true;
      if (field && !seen.has(field)) {
        seen.add(field);
        record[field] = value;
      }
    });
    if (any) records.push(record);
  });
  return { headers, columns, records };
}

export function chicagoParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function addDaysISO(now, days) {
  const { y, m, d } = chicagoParts(now);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function formatMonthDay(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return iso || "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

export function parseDate(value) {
  const text = String(value ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (us) return { y: Number(us[3]), m: Number(us[1]), d: Number(us[2]) };
  return null;
}

export function daysUntilStart(value, now = new Date()) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const target = Date.UTC(parsed.y, parsed.m - 1, parsed.d);
  const todayParts = chicagoParts(now);
  const today = Date.UTC(todayParts.y, todayParts.m - 1, todayParts.d);
  return Math.round((target - today) / 86400000);
}

export function effectiveDays(record, now = new Date()) {
  const raw = String(record.daysUntilStart ?? "").trim();
  if (raw !== "" && Number.isFinite(Number(raw))) return Number(raw);
  if (record.startDate) return daysUntilStart(record.startDate, now);
  return null;
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

export function plain(value) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}
