import { STATUS, effectiveDays, isEmail, plain } from "./schema.js";
import { SUBJECTS, TEMPLATES } from "./templates.js";

export function isTransientError(err) {
  if (!err) return false;
  if (err.transient === true) return true;
  const status = err.response?.status || err.status;
  if (status === 429 || (typeof status === "number" && status >= 500 && status <= 599)) return true;
  if (typeof err.code === "number" && (err.code === 429 || err.code >= 500)) return true;
  const message = String(err.message || "");
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|rate limit|backend error|internal error/i.test(
    message
  );
}

export async function retry(fn, { attempts = 2, wait = defaultWait } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt >= attempts || !isTransientError(err)) throw err;
      await wait(300 * attempt);
    }
  }
  throw lastError;
}

function defaultWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildOfferBatches(records) {
  const batches = new Map();
  const skipped = [];
  for (const record of records) {
    if (record.status !== STATUS.offer) continue;
    if (!plain(record.className)) {
      skipped.push({
        rowNumber: record._rowNumber,
        className: "",
        reason: "Missing class name",
      });
      continue;
    }
    if (!plain(record.email)) {
      skipped.push({
        rowNumber: record._rowNumber,
        className: record.className,
        reason: "No tutor email",
      });
      continue;
    }
    const email = plain(record.email).toLowerCase();
    if (!batches.has(email)) {
      batches.set(email, {
        email,
        tutorName: plain(record.tutorName),
        classes: [],
      });
    }
    const batch = batches.get(email);
    if (!batch.tutorName && plain(record.tutorName)) batch.tutorName = plain(record.tutorName);
    batch.classes.push({
      rowNumber: record._rowNumber,
      className: record.className,
      schedule: record.schedule || "",
      startDate: record.startDate || "",
      daysUntilStart: record.daysUntilStart || "",
      subject: record.subject || "",
    });
  }

  const list = [...batches.values()].map((batch) => ({
    ...batch,
    subject: SUBJECTS.offers,
    body: TEMPLATES.bulkOffer({ classes: batch.classes }),
  }));
  return { batches: list, skipped };
}

export function selectOpenSubs(records) {
  return records
    .filter((record) => plain(record.className) && (record.status === STATUS.available || record.status === ""))
    .map((record) => ({
      rowNumber: record._rowNumber,
      className: record.className,
      date: record.date || "",
      time: record.time || "",
      duration: record.duration || "",
    }));
}

export function selectIcaBlocked(records) {
  return records
    .filter((record) => record.status === STATUS.notInProgress && (plain(record.tutorName) || plain(record.email)))
    .map((record) => ({
      rowNumber: record._rowNumber,
      tutorName: plain(record.tutorName),
      tutorEmail: plain(record.email),
      className: record.className || "",
    }));
}

export function selectNatWindow(records, now = new Date()) {
  return records
    .filter((record) => record.status === STATUS.accepted && plain(record.className))
    .map((record) => ({ record, days: effectiveDays(record, now) }))
    .filter((item) => item.days != null && item.days <= 30 && item.days >= 0)
    .map(({ record, days }) => ({
      rowNumber: record._rowNumber,
      className: record.className,
      daysUntilStart: days,
      tutorName: plain(record.tutorName) || "Unassigned",
      tutorEmail: plain(record.email),
      schedule: record.schedule || "",
      startDate: record.startDate || "",
    }))
    .sort((a, b) => a.daysUntilStart - b.daysUntilStart);
}

export function selectInstructors(records) {
  return records
    .filter((record) => plain(record.tutorName) && plain(record.email))
    .map((record) => ({
      tutorName: plain(record.tutorName),
      tutorEmail: plain(record.email),
      subjects: record.subjects || "",
      icaStatus: record.icaStatus || "",
    }));
}

async function safeLog(log, entry) {
  if (!log) return;
  try {
    await log(entry);
  } catch (err) {
    console.error("Activity log failed:", err);
  }
}

export async function performSend({ action, message, send, applySheet, log, detail, wait }) {
  try {
    await retry((attempt) => send(message, attempt), { wait });
  } catch (err) {
    const error = err.message || "Send failed";
    await safeLog(log, {
      action,
      status: "failed",
      recipient: message.to,
      detail: detail || message.subject,
      error,
    });
    return { ok: false, stage: "email", emailSent: false, error, to: message.to };
  }

  if (applySheet) {
    try {
      await applySheet();
    } catch (err) {
      const error = err.message || "Sheet update failed";
      await safeLog(log, {
        action,
        status: "partial",
        recipient: message.to,
        detail: "Email sent. The sheet was not updated. Do not resend.",
        error,
      });
      return { ok: false, stage: "sheet", emailSent: true, error, to: message.to };
    }
  }

  await safeLog(log, {
    action,
    status: "sent",
    recipient: message.to,
    detail: detail || message.body,
    error: "",
  });
  return { ok: true, to: message.to };
}

export async function deliverOfferBatches(batches, deps) {
  const sent = [];
  const failed = [];
  for (const batch of batches) {
    const message = { to: batch.email, subject: batch.subject, body: batch.body };
    const outcome = await performSend({
      action: "send-offers",
      message,
      send: (payload, attempt) => deps.send(payload, batch, attempt),
      applySheet: () => deps.markWaiting(batch),
      log: deps.log,
      detail: batch.body,
      wait: deps.wait,
    });
    const summary = {
      email: batch.email,
      tutorName: batch.tutorName,
      classCount: batch.classes.length,
      classes: batch.classes.map((item) => item.className),
    };
    if (outcome.ok) sent.push(summary);
    else failed.push({ ...summary, stage: outcome.stage, emailSent: outcome.emailSent, error: outcome.error });
  }
  return { sent, failed };
}

export function validateSubRequest(body) {
  const tutorEmail = plain(body.tutorEmail);
  const className = plain(body.className);
  const rowNumber = Number(body.rowNumber);
  if (!rowNumber || !tutorEmail || !className) {
    return "Missing rowNumber, tutorEmail, or className";
  }
  if (!isEmail(tutorEmail)) return "Tutor email is not valid";
  return null;
}

export function validateInquiry(body) {
  const tutorEmail = plain(body.tutorEmail);
  if (!tutorEmail) return "Missing tutorEmail";
  if (!isEmail(tutorEmail)) return "Tutor email is not valid";
  return null;
}
