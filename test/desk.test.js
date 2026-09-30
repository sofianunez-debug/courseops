import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import {
  assertSendAllowed,
  LIVE_OFFER_WEBHOOK,
  outgoingInstructor,
  PRODUCTION_WORKBOOK_PATH,
  publishPath,
  TEST_OFFER_WEBHOOK,
  TEST_WORKBOOK_PATH,
} from "../netlify/functions/_shared/sheet-guards.js";
import { buildDesk, suggestTutor } from "../netlify/functions/_shared/workbook.js";

const root = path.resolve(".");
const dir = await mkdtemp(path.join(tmpdir(), "courseops-desk-"));

function blankRow() {
  return Array.from({ length: 22 }, () => "");
}

function workingRow(fields) {
  const row = blankRow();
  for (const [index, value] of Object.entries(fields)) row[Number(index)] = value;
  return row;
}

const workbook = {
  spreadsheetTitle: "Copy of Staffing",
  testCopy: true,
  testRecipient: "qa@varsitytutors.com",
  workingTab: "Working Tab",
  tabs: {
    "Working Tab": {
      headers: blankRow().map((_cell, index) => `Column ${index}`),
      rows: [
        workingRow({
          0: "LS-1",
          1: "Algebra 1",
          2: "10/20/2026",
          4: "Tue",
          5: "4:00 PM",
          6: "60",
          10: "Livestream",
          16: "Ada Lovelace",
          17: "ada@varsitytutors.com",
          18: "Offered",
          21: "Offer",
        }),
        workingRow({
          0: "LS-2",
          1: "Algebra 1 Honors",
          2: "10/22/2026",
          4: "Thu",
          5: "5:00 PM",
          10: "Livestream",
          18: "Offered",
        }),
        workingRow({
          0: "LS-3",
          1: "Geometry",
          2: "10/08/2026",
          10: "Livestream",
          16: "Grace Hopper",
          17: "grace@varsitytutors.com",
          18: "NAT in Progress",
        }),
        workingRow({
          0: "LS-4",
          1: "Chemistry",
          2: "11/02/2026",
          10: "Livestream",
          16: "Marie Curie",
          17: "marie@varsitytutors.com",
          18: "ICA Needed",
        }),
        workingRow({
          0: "SG-1",
          1: "Reading Lab",
          10: "Small Group",
          18: "Offered",
          16: "Ada Lovelace",
          17: "ada@varsitytutors.com",
        }),
      ],
    },
    Subs: {
      headers: ["Course Name", "Date", "Time", "Duration", "Tutor Name", "Email", "Status"],
      rows: [
        ["Algebra 1", "10/21/2026", "4:00 PM", "60", "", "", "Sub Request"],
        ["Reading Lab", "10/21/2026", "4:00 PM", "60", "", "", "Sub Request"],
      ],
    },
    Instructors: {
      headers: ["Tutor Name", "Email", "Subjects"],
      rows: [["Ada Lovelace", "ada@varsitytutors.com", "Algebra 1"]],
    },
    "Monthly Classes (NEW)": {
      headers: ["Course", "B", "C", "D", "E", "F", "G", "H", "I", "J", "Tutor"],
      rows: [["Algebra 1 Honors", "", "", "", "", "", "", "", "", "", "Ada Lovelace"]],
    },
  },
};

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Missing ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unclosed ${name}`);
}

test("offered rows, suggestions, subs, ICA, and the 30-day window come from the sheet", () => {
  const desk = buildDesk(workbook, new Date("2026-09-30T18:00:00Z"));
  assert.equal(desk.testCopy, true);
  assert.equal(desk.testRecipient, "qa@varsitytutors.com");
  const offered = desk.working.filter((row) => row.status === "Offered");
  assert.equal(offered.length, 3);
  assert.equal(offered[0].time, "4:00 PM");
  const unmatched = offered.find((row) => row.className === "Algebra 1 Honors");
  assert.equal(unmatched.tutorEmail, "");
  assert.equal(unmatched.suggestion.tutorEmail, "ada@varsitytutors.com");
  assert.match(unmatched.suggestion.reason, /^Subject match: teaches /);
  assert.equal(desk.offers.batches.length, 1);
  assert.equal(desk.offers.batches[0].classes.length, 2);
  assert.equal(desk.subs.length, 1);
  assert.equal(desk.subs[0].className, "Algebra 1");
  assert.equal(desk.subs[0].suggestion.tutorEmail, "ada@varsitytutors.com");
  assert.equal(desk.icaBlocked.length, 1);
  assert.equal(desk.icaBlocked[0].status, "ICA Needed");
  assert.equal(desk.nat.length, 1);
  assert.equal(desk.nat[0].className, "Geometry");
});

test("a tutor is suggested from courses they already teach", () => {
  const suggestion = suggestTutor("Algebra 1 Honors", [
    { tutorName: "Ada Lovelace", tutorEmail: "ada@varsitytutors.com", courses: ["Algebra 1"] },
    { tutorName: "Grace Hopper", tutorEmail: "grace@varsitytutors.com", courses: ["Geometry"] },
  ]);
  assert.equal(suggestion.tutorEmail, "ada@varsitytutors.com");
  assert.match(suggestion.reason, /Subject match/);
});

test("a test copy cannot publish over the live workbook or call the live webhooks", () => {
  assert.equal(
    publishPath({ title: "Copy of Staffing", configuredPath: PRODUCTION_WORKBOOK_PATH }),
    TEST_WORKBOOK_PATH,
  );
  assert.throws(() =>
    assertSendAllowed({
      title: "Copy of Staffing",
      allowSend: "yes",
      webhook: LIVE_OFFER_WEBHOOK,
      kind: "offer",
    }),
  );
  assert.throws(() =>
    assertSendAllowed({
      title: "Copy of Staffing",
      allowSend: "no",
      webhook: TEST_OFFER_WEBHOOK,
      kind: "offer",
    }),
  );
  assert.equal(
    assertSendAllowed({
      title: "Copy of Staffing",
      allowSend: "yes",
      webhook: TEST_OFFER_WEBHOOK,
      kind: "offer",
    }),
    TEST_OFFER_WEBHOOK,
  );
  const mail = outgoingInstructor("ada@varsitytutors.com", {
    title: "Copy of Staffing",
    testRecipient: "qa@varsitytutors.com",
  });
  assert.equal(mail.instructorEmail, "qa@varsitytutors.com");
  assert.equal(mail.originalInstructorEmail, "ada@varsitytutors.com");
  assert.equal(
    outgoingInstructor("ada@varsitytutors.com", { title: "Staffing" }).instructorEmail,
    "ada@varsitytutors.com",
  );
});

test("the sheet web app does not call the spreadsheet UI, and the test copy is guarded", () => {
  const sync = readFileSync(path.join(root, "scripts/sheet-sync/Code.gs"), "utf8");
  const email = readFileSync(path.join(root, "scripts/sheet-email/Code.gs"), "utf8");
  for (const name of ["doGet", "doPost", "publishWorkbook_", "publishSheetIfChanged"]) {
    assert.equal(functionBody(sync, name).includes("getUi"), false, name);
  }
  for (const name of ["sendOfferedCourses_", "sendSubRequests_", "sendIcaSignature_", "sendConflictEmails_"]) {
    assert.equal(functionBody(email, name).includes("getUi"), false, name);
  }
  assert.match(email, /TEST_OFFER_WEBHOOK/);
  assert.match(email, /originalInstructorEmail/);
  assert.match(sync, /data\/workbook-test\.json/);
  assert.match(sync, /cannot publish over data\/workbook\.json/);
  assert.equal(sync.includes("function onOpen"), false);
  assert.match(email, /function onOpen/);
});

test("the desk API returns offered rows from the published workbook", async () => {
  const file = path.join(dir, "workbook.json");
  await writeFile(file, JSON.stringify(workbook));
  process.env.COURSEOPS_DEV_AUTH = "preview";
  process.env.WORKBOOK_FILE = file;
  delete process.env.SHEET_WEBAPP_URL;
  delete process.env.GITHUB_TOKEN;
  delete process.env.NETLIFY;
  const { default: pending } = await import(`../netlify/functions/list-pending.js?desk=${Date.now()}`);
  const response = await pending(new Request("http://127.0.0.1/api/pending"));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.testCopy, true);
  assert.ok(body.working.some((row) => row.status === "Offered" && row.className === "Algebra 1"));
  assert.match(
    body.working.find((row) => row.className === "Algebra 1 Honors").suggestion.reason,
    /^Subject match:/,
  );
});
