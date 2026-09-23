import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { columnLetter, daysUntilStart, headerToField, normalizeRecords } from "../netlify/functions/_shared/schema.js";
import { buildRawMessage } from "../netlify/functions/_shared/mail.js";
import { createSeed } from "../netlify/functions/_shared/sample-data.js";
import {
  buildOfferBatches,
  deliverOfferBatches,
  selectIcaBlocked,
  selectNatWindow,
  selectOpenSubs,
} from "../netlify/functions/_shared/workflow.js";

const storeDir = await mkdtemp(path.join(tmpdir(), "course-staffing-"));
process.env.DATA_MODE = "preview";
process.env.DASHBOARD_ACCESS_KEY = "preview";
process.env.STORE_PATH = path.join(storeDir, "store.json");
delete process.env.SHEET_ID;
delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
delete process.env.SLACK_WEBHOOK_URL;

after(async () => {
  await rm(storeDir, { recursive: true, force: true });
});

function request(pathname, { method = "GET", body, key = "preview" } = {}) {
  const headers = new Headers();
  if (key) headers.set("x-dashboard-key", key);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(`http://127.0.0.1${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("column letters and header aliases", () => {
  assert.equal(columnLetter(0), "A");
  assert.equal(columnLetter(25), "Z");
  assert.equal(columnLetter(26), "AA");
  assert.equal(headerToField("Tutor Email"), "email");
  assert.equal(headerToField("Offer Status"), "status");
  assert.equal(headerToField("Days Until Start"), "daysUntilStart");
  const normalized = normalizeRecords(
    ["Tutor Email", "Email", "Status"],
    [["first@example.com", "second@example.com", "Offer"]]
  );
  assert.equal(normalized.records[0].email, "first@example.com");
  assert.equal(normalized.columns.email, "A");
  assert.equal(normalized.columns.status, "C");
});

test("days until start uses the Central calendar", () => {
  const now = new Date("2026-09-23T18:30:00.000Z");
  assert.equal(daysUntilStart("2026-10-05", now), 12);
  assert.equal(daysUntilStart("10/05/2026", now), 12);
  assert.equal(daysUntilStart("not a date", now), null);
});

test("offer grouping, NAT window, subs, and ICA filters", () => {
  const now = new Date("2026-09-23T15:00:00.000Z");
  const { records } = normalizeRecords(createSeed(now).tabs.Working.headers, createSeed(now).tabs.Working.rows);
  const subs = normalizeRecords(createSeed(now).tabs.Subs.headers, createSeed(now).tabs.Subs.rows);
  const offers = buildOfferBatches(records);
  assert.deepEqual(
    offers.batches.map((batch) => [batch.email, batch.classes.length]),
    [
      ["maya.chen@example.com", 2],
      ["priya.shah@example.com", 1],
    ]
  );
  assert.equal(offers.skipped[0].className, "Spanish Conversation");
  assert.match(offers.batches[0].body, /AP Calculus AB/);
  assert.match(offers.batches[0].body, /SAT Math Intensive/);

  const nat = selectNatWindow(records, now).map((item) => item.className);
  assert.deepEqual(nat, ["Geometry", "AP Biology"]);
  assert.equal(selectIcaBlocked(records).length, 1);
  assert.equal(selectIcaBlocked(records)[0].tutorName, "Luis Ortega");
  assert.equal(selectOpenSubs(subs.records).length, 2);

  const blankDays = normalizeRecords(
    ["Class Name", "Status", "Start Date", "Days Until Start"],
    [["Geometry", "Accepted", "2026-10-05", ""]]
  );
  assert.equal(selectNatWindow(blankDays.records, now)[0].daysUntilStart, 12);
});

test("a failed tutor does not block the rest of an offer batch", async () => {
  const batches = [
    { email: "a@example.com", tutorName: "A", subject: "S", body: "A body", classes: [{ rowNumber: 2, className: "One" }] },
    { email: "b@example.com", tutorName: "B", subject: "S", body: "B body", classes: [{ rowNumber: 3, className: "Two" }] },
    { email: "c@example.com", tutorName: "C", subject: "S", body: "C body", classes: [{ rowNumber: 4, className: "Three" }] },
  ];
  const marked = [];
  const logged = [];
  const result = await deliverOfferBatches(batches, {
    async send(message) {
      if (message.to === "b@example.com") throw new Error("mailbox rejected");
    },
    async markWaiting(batch) {
      marked.push(batch.email);
    },
    async log(entry) {
      logged.push(entry);
    },
    wait: async () => {},
  });
  assert.deepEqual(marked, ["a@example.com", "c@example.com"]);
  assert.equal(result.sent.length, 2);
  assert.equal(result.failed[0].email, "b@example.com");
  assert.equal(result.failed[0].stage, "email");
  assert.equal(result.failed[0].emailSent, false);
  assert.equal(logged.filter((entry) => entry.status === "failed").length, 1);
});

test("sheet update failure does not send the offer twice", async () => {
  let sends = 0;
  const result = await deliverOfferBatches(
    [{ email: "a@example.com", tutorName: "A", subject: "S", body: "Body", classes: [{ rowNumber: 2, className: "One" }] }],
    {
      async send() {
        sends += 1;
      },
      async markWaiting() {
        throw new Error("sheet down");
      },
      async log() {},
      wait: async () => {},
    }
  );
  assert.equal(sends, 1);
  assert.equal(result.failed[0].stage, "sheet");
  assert.equal(result.failed[0].emailSent, true);
});

test("transient mail errors are retried once", async () => {
  let sends = 0;
  const result = await deliverOfferBatches(
    [{ email: "a@example.com", tutorName: "A", subject: "S", body: "Body", classes: [{ rowNumber: 2, className: "One" }] }],
    {
      async send() {
        sends += 1;
        if (sends === 1) throw new Error("socket hang up");
      },
      async markWaiting() {},
      async log() {},
      wait: async () => {},
    }
  );
  assert.equal(sends, 2);
  assert.equal(result.sent.length, 1);
});

test("mail headers cannot be injected", () => {
  const raw = buildRawMessage({
    to: "tutor@example.com\nBcc: evil@example.com",
    subject: "Hello\nBcc: evil@example.com",
    body: "Line one\nLine two",
  });
  const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
  const decoded = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const [headers, body] = decoded.split("\r\n\r\n");
  assert.equal(headers.split("\r\n").some((line) => line.toLowerCase().startsWith("bcc:")), false);
  assert.match(headers, /^Subject: Hello Bcc: evil@example.com$/m);
  assert.match(body, /Line one\nLine two/);
});

test("preview desk sends, logs failures, and resets", async () => {
  const pendingHandler = (await import("../netlify/functions/list-pending.js")).default;
  const offersHandler = (await import("../netlify/functions/send-offers.js")).default;
  const activityHandler = (await import("../netlify/functions/list-activity.js")).default;
  const subHandler = (await import("../netlify/functions/send-sub-request.js")).default;
  const icaHandler = (await import("../netlify/functions/send-ica-reminder.js")).default;
  const inquiryHandler = (await import("../netlify/functions/send-general-inquiry-reply.js")).default;
  const natHandler = (await import("../netlify/functions/check-nat-window.js")).default;
  const resetHandler = (await import("../netlify/functions/reset-preview.js")).default;
  const { readTab, updateFields } = await import("../netlify/functions/_shared/store.js");

  const denied = await pendingHandler(request("/api/pending", { key: "nope" }));
  assert.equal(denied.status, 401);

  const pendingRes = await pendingHandler(request("/api/pending"));
  const pending = await pendingRes.json();
  assert.equal(pending.mode, "preview");
  assert.equal(pending.offers.batches.length, 2);
  assert.equal(pending.openSubs.length, 2);
  assert.equal(pending.icaBlocked.length, 1);
  assert.equal(pending.nat.length, 2);
  assert.equal(pending.instructors.length, 8);

  const offerRes = await offersHandler(request("/api/offers", { method: "POST", body: { simulateFailure: true } }));
  const offers = await offerRes.json();
  assert.equal(offerRes.status, 200);
  assert.equal(offers.sent.length, 1);
  assert.equal(offers.sent[0].email, "priya.shah@example.com");
  assert.equal(offers.failed[0].email, "maya.chen@example.com");
  assert.equal(offers.failed[0].emailSent, false);

  const working = await readTab("Working");
  const maya = working.records.filter((row) => row.email === "maya.chen@example.com" && row.status === "Offer");
  const priya = working.records.find((row) => row.email === "priya.shah@example.com");
  assert.equal(maya.length, 2);
  assert.equal(priya.status, "Waiting for response");

  const activity = await (await activityHandler(request("/api/activity"))).json();
  assert.ok(activity.entries.some((entry) => entry.status === "failed" && entry.action === "send-offers"));
  assert.ok(activity.entries.some((entry) => entry.status === "sent" && entry.recipient === "priya.shah@example.com"));

  const sub = pending.openSubs[0];
  const subRes = await subHandler(
    request("/api/sub-request", {
      method: "POST",
      body: { ...sub, tutorEmail: "riley.nguyen@example.com", tutorName: "Riley Nguyen" },
    })
  );
  assert.equal(subRes.status, 200);
  const subs = await readTab("Subs");
  const covered = subs.records.find((row) => row._rowNumber === sub.rowNumber);
  assert.equal(covered.status, "Waiting for response");
  assert.match(covered.note, /Riley Nguyen/);

  const closed = await subHandler(
    request("/api/sub-request", {
      method: "POST",
      body: { ...sub, tutorEmail: "riley.nguyen@example.com", tutorName: "Riley Nguyen" },
    })
  );
  assert.equal(closed.status, 409);

  const ica = pending.icaBlocked[0];
  const icaRes = await icaHandler(request("/api/ica-reminder", { method: "POST", body: ica }));
  assert.equal(icaRes.status, 200);
  const reminded = (await readTab("Working")).records.find((row) => row._rowNumber === ica.rowNumber);
  assert.match(reminded.note, /ICA reminder sent/);

  const badInquiry = await inquiryHandler(
    request("/api/inquiry", { method: "POST", body: { tutorEmail: "not-an-email" } })
  );
  assert.equal(badInquiry.status, 400);
  const inquiry = await inquiryHandler(
    request("/api/inquiry", { method: "POST", body: { tutorEmail: "new.tutor@example.com" } })
  );
  assert.equal(inquiry.status, 200);

  const nat = await (await natHandler(request("/api/nat-window", { method: "POST", body: {} }))).json();
  assert.equal(nat.flagged, 2);
  assert.equal(nat.slackPosted, false);
  assert.equal(nat.slackSkipped, true);

  const scheduled = await natHandler(
    request("/api/nat-window", { method: "POST", key: null, body: { next_run: "2026-09-24T13:00:00.000Z" } })
  );
  assert.equal(scheduled.status, 200);
  const locked = await natHandler(request("/api/nat-window", { method: "POST", key: null, body: {} }));
  assert.equal(locked.status, 401);

  const algebra = working.records.find((row) => row.className === "Algebra 2 Honors");
  await assert.rejects(
    updateFields("Working", [
      { rowNumber: algebra._rowNumber, field: "status", value: "Offer" },
      { rowNumber: 999, field: "status", value: "Offer" },
    ])
  );
  const after = (await readTab("Working")).records.find((row) => row.className === "Algebra 2 Honors");
  assert.equal(after.status, "Waiting for response");

  const reset = await resetHandler(request("/api/reset", { method: "POST", body: {} }));
  assert.equal(reset.status, 200);
  const restored = await (await pendingHandler(request("/api/pending"))).json();
  assert.equal(restored.offers.batches.length, 2);
  assert.equal(restored.openSubs.length, 2);
});
