import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_CSV, parseCsv } from "../src/lib/csv.ts";
import { offerBody, offerSubject } from "../src/lib/email.ts";
import { scheduledHours, sessionCount } from "../src/lib/format.ts";
import { filterCourses, suggestInstructors } from "../src/lib/schedule.ts";
import { createSeed } from "../src/lib/seed.ts";

const TODAY = "2026-10-24";

test("default roster hides ended courses and sorts needs-tutor first", () => {
  const { courses, instructors } = createSeed();
  const { visible, endedCount } = filterCourses(courses, {
    search: "",
    rateType: "",
    subject: "",
    productType: "",
    needsTutorOnly: false,
    hideEnded: true,
    today: TODAY,
  });
  assert.equal(endedCount, 2);
  assert.equal(visible.some((course) => course.id === "GC-2601" || course.id === "GC-2602"), false);
  assert.equal(visible[0]?.id, "GC-2706");
  assert.equal(visible.at(-1)?.id, "GC-2714");
  const ranks = visible.map((course) => course.status);
  const waitingAt = ranks.indexOf("Waiting for response");
  const assignedAt = ranks.indexOf("Assigned");
  const cancelledAt = ranks.indexOf("Cancelled");
  assert.ok(waitingAt > 0);
  assert.ok(assignedAt > waitingAt);
  assert.ok(cancelledAt > assignedAt);
  assert.equal(instructors.length >= 8, true);
});

test("scheduled hours count each meeting date", () => {
  const bootcamp = createSeed().courses.find((course) => course.id === "GC-2702");
  assert.ok(bootcamp);
  assert.equal(sessionCount(bootcamp), 4);
  assert.equal(scheduledHours(bootcamp), 6);
  const prep = createSeed().courses.find((course) => course.id === "GC-2701");
  assert.ok(prep);
  assert.equal(sessionCount(prep), 8);
  assert.equal(scheduledHours(prep), 12);
});

test("offer email uses the operations sign-off and product subject", () => {
  const { courses } = createSeed();
  const bootcamp = courses.find((course) => course.id === "GC-2702");
  const prep = courses.find((course) => course.id === "GC-2701");
  assert.ok(bootcamp && prep);
  assert.equal(offerSubject([bootcamp]), "Varsity Tutors - New Small Group Course(s) Available Opportunities");
  assert.equal(
    offerSubject([prep, bootcamp]),
    "Varsity Tutors - New Livestream & Small Group Course(s) Available Opportunities (2 Courses Available)",
  );
  const body = offerBody("Priya Shah", [bootcamp]);
  assert.match(body, /^Hello Priya,/);
  assert.match(body, /\[Option 1\] SAT Math 1-Week Bootcamp/);
  assert.match(body, /Dates: February 28, 2027 - March 3, 2027/);
  assert.match(body, /Time: 7:30 PM \(Sun, Mon, Tue, Wed\)/);
  assert.match(body, /Duration: 1\.5 hour\(s\) \| Rate: \$100\/hr/);
  assert.match(body, /Best regards,\nSofia N & The Group Courses Operations Team$/);
});

test("suggested tutors are greenlit subject matches, including teaching history", () => {
  const { courses, instructors } = createSeed();
  const prep = courses.find((course) => course.id === "GC-2701");
  assert.ok(prep);
  const names = suggestInstructors(prep, instructors, courses).map((instructor) => instructor.name);
  assert.deepEqual(names, ["Priya Shah", "James Okonkwo", "Hannah Brooks"]);
});

test("sample CSV imports as available courses without wiping ids of existing rows", () => {
  const parsed = parseCsv(SAMPLE_CSV);
  const ready = parsed.rows.flatMap((row) => (row.course ? [row.course] : []));
  assert.equal(parsed.rows.length, 3);
  assert.equal(ready.length, 3);
  assert.equal(ready[0]?.status, "Available");
  assert.equal(ready[0]?.time, "18:00:00");
  assert.equal(ready[1]?.productType, "Small Group");
  assert.equal(ready[2]?.daysOfWeek.join(", "), "Mon, Wed");
  const sheet = parseCsv("Class Name\tStart Date\tEnd Date\tDays of Week\tMeeting Time\tDuration\tPlacement Subject\tDelivery Type\tRate ($/hr)\nGeometry Studio\t3/2/2027\t3/30/2027\tTue / Thu\t5:00 PM CT\t90 min\tAlgebra\tSmall Group\t$80/hr\n");
  const geometry = sheet.rows[0]?.course;
  assert.equal(sheet.rows[0]?.error, null);
  assert.equal(geometry?.name, "Geometry Studio");
  assert.equal(geometry?.startDate, "2027-03-02");
  assert.equal(geometry?.time, "17:00:00");
  assert.equal(geometry?.duration, 1.5);
  assert.deepEqual(geometry?.daysOfWeek, ["Tue", "Thu"]);
  assert.equal(geometry?.rateType, "Academic");
});

test("starburst proxy reports not configured and does not invent rows", async () => {
  const { default: handler } = await import("../netlify/functions/starburst-roster.ts");
  const response = await handler(new Request("http://localhost/api/starburst-roster"), {} as never);
  assert.equal(response.status, 503);
  const body = (await response.json()) as { error: string; courses?: unknown; message: string };
  assert.equal(body.error, "not configured");
  assert.equal(body.courses, undefined);
  assert.match(body.message, /No query was run/);
});
