import { titleLooksLikeTestCopy } from "./sheet-guards.js";

export const WORKING_COLUMNS = {
  courseId: 0,
  courseName: 1,
  start: 2,
  end: 3,
  days: 4,
  time: 5,
  duration: 6,
  courseType: 10,
  assignTo: 16,
  email: 17,
  status: 18,
  template: 21,
};

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "of",
  "for",
  "in",
  "to",
  "with",
  "class",
  "course",
  "live",
  "livestream",
  "small",
  "group",
  "new",
]);

export function cell(row, index) {
  if (!Array.isArray(row)) return "";
  const value = row[index];
  return value == null ? "" : String(value).trim();
}

export function parseSheetDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(text);
  if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${year.padStart(4, "0")}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function chicagoToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year").value);
  const month = Number(parts.find((part) => part.type === "month").value);
  const day = Number(parts.find((part) => part.type === "day").value);
  return Date.UTC(year, month - 1, day);
}

export function daysUntil(iso, now = new Date()) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  const start = Date.UTC(year, month - 1, day);
  return Math.round((start - chicagoToday(now)) / 86400000);
}

export function findTab(workbook, name) {
  const tabs = workbook?.tabs || {};
  if (tabs[name]) return tabs[name];
  const match = Object.keys(tabs).find((key) => key.trim().toLowerCase() === name.trim().toLowerCase());
  return match ? tabs[match] : null;
}

export function headerIndex(tab, header) {
  const headers = tab?.headers || [];
  const want = header.trim().toLowerCase();
  return headers.findIndex((item) => String(item || "").trim().toLowerCase() === want);
}

function rowObjects(tab) {
  const headers = tab?.headers || [];
  return (tab?.rows || []).map((row, index) => {
    const record = { rowNumber: index + 2 };
    headers.forEach((header, column) => {
      const key = String(header || "").trim();
      if (key) record[key] = cell(row, column);
    });
    record._cells = row;
    return record;
  });
}

export function workbookIsTestCopy(workbook) {
  if (!workbook) return false;
  if (workbook.testCopy === true) return true;
  return titleLooksLikeTestCopy(workbook.spreadsheetTitle || workbook.title || "");
}

function tokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function suggestTutor(courseName, teachers) {
  const want = tokens(courseName);
  if (want.length === 0) return null;
  let best = null;
  for (const teacher of teachers) {
    if (!teacher?.tutorEmail) continue;
    let matchedCourse = "";
    let overlap = 0;
    for (const course of teacher.courses || []) {
      const have = new Set(tokens(course));
      let count = 0;
      for (const token of want) if (have.has(token)) count += 1;
      if (count > overlap) {
        overlap = count;
        matchedCourse = course;
      }
    }
    if (overlap === 0) continue;
    const ratio = overlap / want.length;
    if (ratio < 0.34 && overlap < 2) continue;
    if (!best || overlap > best.overlap || (overlap === best.overlap && ratio > best.ratio)) {
      best = {
        tutorName: teacher.tutorName,
        tutorEmail: teacher.tutorEmail,
        overlap,
        ratio,
        matchedCourse,
      };
    }
  }
  if (!best) return null;
  return {
    tutorName: best.tutorName,
    tutorEmail: best.tutorEmail,
    reason: `Subject match: teaches ${best.matchedCourse}`,
    matchedCourse: best.matchedCourse,
  };
}

function daysLabel(startIso, endIso, now) {
  const untilEnd = daysUntil(endIso, now);
  const untilStart = daysUntil(startIso, now);
  if (endIso && untilEnd !== "" && untilEnd < 0) return "ended";
  if (startIso && untilStart !== "" && untilStart < 0) return "in progress";
  if (untilStart !== "" && untilStart <= 7) return "starts soon";
  return "";
}

function isLivestream(courseType) {
  const text = String(courseType || "").trim();
  if (!text) return true;
  return /live\s*stream/i.test(text);
}

function isSmallGroup(courseType) {
  return /small\s*group/i.test(String(courseType || ""));
}

function blankWorking(rowNumber) {
  return {
    rowNumber,
    className: "",
    courseId: "",
    subject: "",
    productType: "",
    start: "",
    end: "",
    days: "",
    time: "",
    duration: "",
    tutorName: "",
    tutorEmail: "",
    status: "",
    templateName: "",
    daysUntilStart: "",
    daysLabel: "",
    open: false,
    month: "",
    workingOn: "",
    note: "",
    rate: "",
    rateType: "",
    suggestion: null,
  };
}

export function readWorking(workbook, now = new Date()) {
  const tabName = workbook?.workingTab || "Working Tab";
  const tab = findTab(workbook, tabName);
  const rows = tab?.rows || [];
  return rows
    .map((row, index) => {
      const item = blankWorking(index + 2);
      item.courseId = cell(row, WORKING_COLUMNS.courseId);
      item.className = cell(row, WORKING_COLUMNS.courseName);
      item.subject = item.className;
      item.productType = cell(row, WORKING_COLUMNS.courseType);
      item.start = parseSheetDate(cell(row, WORKING_COLUMNS.start));
      item.end = parseSheetDate(cell(row, WORKING_COLUMNS.end));
      item.days = cell(row, WORKING_COLUMNS.days);
      item.time = cell(row, WORKING_COLUMNS.time);
      item.duration = cell(row, WORKING_COLUMNS.duration);
      item.tutorName = cell(row, WORKING_COLUMNS.assignTo);
      item.tutorEmail = cell(row, WORKING_COLUMNS.email);
      item.status = cell(row, WORKING_COLUMNS.status);
      item.templateName = cell(row, WORKING_COLUMNS.template);
      item.daysUntilStart = item.start ? daysUntil(item.start, now) : "";
      item.daysLabel = daysLabel(item.start, item.end, now);
      const withinMonth =
        item.daysUntilStart !== "" && item.daysUntilStart >= 0 && item.daysUntilStart <= 30;
      item.open = withinMonth && item.daysLabel !== "ended" && isLivestream(item.productType);
      return item;
    })
    .filter((item) => item.className || item.courseId || item.status);
}

function columnValue(record, header) {
  if (!header) return "";
  if (record[header] != null && record[header] !== "") return String(record[header]).trim();
  const found = Object.keys(record).find((key) => key.toLowerCase() === header.toLowerCase());
  return found ? String(record[found] || "").trim() : "";
}

export function readSubs(workbook, working) {
  const tab = findTab(workbook, "Subs");
  if (!tab) return [];
  const smallGroupNames = new Set(
    working
      .filter((item) => isSmallGroup(item.productType))
      .map((item) => item.className.toLowerCase()),
  );
  return rowObjects(tab)
    .map((record) => {
      const className = columnValue(record, "Course Name");
      const courseType = columnValue(record, "Course Type") || columnValue(record, "Type");
      const smallGroup =
        isSmallGroup(courseType) ||
        /small\s*group/i.test(className) ||
        smallGroupNames.has(className.toLowerCase());
      const status = columnValue(record, "Status");
      const tutorEmail = columnValue(record, "Email");
      const tutorName = columnValue(record, "Tutor Name");
      return {
        rowNumber: record.rowNumber,
        className,
        date: columnValue(record, "Date"),
        time: columnValue(record, "Time"),
        duration: columnValue(record, "Duration"),
        tutorName,
        tutorEmail,
        status,
        subName: "",
        subbingFor: "",
        note: "",
        needsCoverage: !tutorEmail && ["", "Available", "Offered", "Sub Request"].includes(status),
        smallGroup,
        suggestion: null,
      };
    })
    .filter((item) => item.className && !item.smallGroup);
}

export function readConflicts(workbook) {
  const tab = findTab(workbook, "Conflicts");
  if (!tab) return [];
  return rowObjects(tab)
    .map((record) => ({
      rowNumber: record.rowNumber,
      tutorName: columnValue(record, "Tutor Name"),
      tutorEmail: columnValue(record, "Email"),
      className: columnValue(record, "Course Name"),
      conflict: columnValue(record, "Conflict"),
      status: columnValue(record, "Status"),
    }))
    .filter((item) => item.className || item.tutorName || item.conflict);
}

function addCourse(teachers, name, email, course) {
  const tutorEmail = String(email || "").trim();
  const tutorName = String(name || "").trim();
  const className = String(course || "").trim();
  if (!tutorEmail || !className) return;
  const key = tutorEmail.toLowerCase();
  let teacher = teachers.get(key);
  if (!teacher) {
    teacher = { tutorName: tutorName || tutorEmail, tutorEmail, courses: [] };
    teachers.set(key, teacher);
  }
  if (tutorName) teacher.tutorName = tutorName;
  if (!teacher.courses.some((item) => item.toLowerCase() === className.toLowerCase())) {
    teacher.courses.push(className);
  }
}

export function teacherIndex(workbook, working) {
  const teachers = new Map();
  for (const row of working) {
    if (row.tutorEmail && row.className) addCourse(teachers, row.tutorName, row.tutorEmail, row.className);
  }
  const instructors = findTab(workbook, "Instructors");
  if (instructors) {
    for (const record of rowObjects(instructors)) {
      const email = columnValue(record, "Email") || columnValue(record, "Tutor Email") || columnValue(record, "Instructor Email");
      const name = columnValue(record, "Tutor Name") || columnValue(record, "Instructor Name") || columnValue(record, "Name");
      const subjects = columnValue(record, "Subjects") || columnValue(record, "Courses");
      for (const subject of subjects.split(",")) addCourse(teachers, name, email, subject);
      if (email && !teachers.has(email.toLowerCase())) {
        teachers.set(email.toLowerCase(), { tutorName: name || email, tutorEmail: email, courses: [] });
      }
    }
  }
  const monthly = findTab(workbook, "Monthly Classes (NEW)") || findTab(workbook, "Monthly Classes");
  if (monthly) {
    for (const row of monthly.rows || []) {
      const tutorName = cell(row, 10);
      const course = cell(row, 0);
      if (!tutorName || !course) continue;
      const teacher = [...teachers.values()].find(
        (item) => item.tutorName.toLowerCase() === tutorName.toLowerCase(),
      );
      if (teacher && course && !teacher.courses.some((item) => item.toLowerCase() === course.toLowerCase())) {
        teacher.courses.push(course);
      }
    }
  }
  return [...teachers.values()];
}

export function instructorRecords(teachers) {
  return teachers
    .map((teacher) => ({
      tutorName: teacher.tutorName,
      tutorEmail: teacher.tutorEmail,
      subjects: teacher.courses.join(", "),
      subjectNotes: "",
      bgTier: "",
      rate: "",
      icaStatus: "",
      instructorType: "",
      profileUrl: "",
    }))
    .sort((a, b) => a.tutorName.localeCompare(b.tutorName));
}

export function applySuggestions(working, subs, teachers) {
  for (const row of working) {
    if (row.tutorEmail) continue;
    row.suggestion = suggestTutor(row.className, teachers);
  }
  for (const row of subs) {
    if (row.tutorEmail) continue;
    row.suggestion = suggestTutor(row.className, teachers);
  }
}

export function selectNatWindow(working) {
  return working.filter((row) => {
    if (row.daysLabel === "ended") return false;
    if (row.daysUntilStart === "" || row.daysUntilStart < 0 || row.daysUntilStart > 30) return false;
    return row.status === "NAT in Progress" || row.status === "Accepted";
  });
}

export function selectIca(working) {
  return working.filter((row) => row.status === "Not in Progress" || row.status === "ICA Needed");
}

export function offerBatches(working) {
  const groups = new Map();
  for (const row of working) {
    if (row.status !== "Offered" && row.status !== "Offer") continue;
    if (!row.tutorEmail) continue;
    const key = row.tutorEmail.toLowerCase();
    let batch = groups.get(key);
    if (!batch) {
      batch = {
        tutorName: row.tutorName || row.tutorEmail,
        email: row.tutorEmail,
        classes: [],
        body: "Make.com sends this offer. The tutor address in the sheet is not changed when this is a test copy.",
      };
      groups.set(key, batch);
    }
    batch.classes.push({
      className: row.className,
      rowNumber: row.rowNumber,
      schedule: [row.days, row.time].filter(Boolean).join(" "),
      daysUntilStart: row.daysUntilStart,
      subject: row.subject,
      productType: row.productType,
    });
  }
  return { batches: [...groups.values()], skipped: working.filter((row) => (row.status === "Offered" || row.status === "Offer") && !row.tutorEmail).map((row) => ({
    className: row.className,
    rowNumber: row.rowNumber,
    reason: row.suggestion
      ? `${row.suggestion.reason}. Confirm Assign before this row can be offered.`
      : "No tutor email yet.",
  })) };
}

export function buildDesk(workbook, now = new Date()) {
  const working = readWorking(workbook, now);
  const subs = readSubs(workbook, working);
  const teachers = teacherIndex(workbook, working);
  applySuggestions(working, subs, teachers);
  const testCopy = workbookIsTestCopy(workbook);
  return {
    mode: workbook?.source === "fixture" ? "preview" : "live",
    previewSource: workbook?.source || "",
    testCopy,
    testRecipient: workbook?.testRecipient || "",
    aiEnabled: false,
    spreadsheetTitle: workbook?.spreadsheetTitle || "",
    warning: workbook?.warning || null,
    working,
    subs,
    conflicts: readConflicts(workbook),
    instructors: instructorRecords(teachers),
    availability: [],
    offers: offerBatches(working),
    icaBlocked: selectIca(working),
    nat: selectNatWindow(working),
    templates: {
      generalInquiry:
        "Thank you for reaching out about teaching small group/live stream courses. Should an opportunity become available that's a good fit, you'll receive an email with next steps.",
    },
  };
}

export async function rewriteSuggestionReasons(desk, rewrite) {
  const targets = [];
  for (const row of [...desk.working, ...desk.subs]) {
    if (row.suggestion?.reason) targets.push(row.suggestion);
  }
  if (targets.length === 0 || typeof rewrite !== "function") return desk;
  const rewritten = await rewrite(targets.map((item) => item.reason));
  if (!Array.isArray(rewritten) || rewritten.length !== targets.length) return desk;
  targets.forEach((item, index) => {
    const next = String(rewritten[index] || "").trim();
    if (next) item.reason = next;
  });
  desk.aiEnabled = true;
  return desk;
}
