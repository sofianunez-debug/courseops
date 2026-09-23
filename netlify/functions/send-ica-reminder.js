import { assertAccess } from "./_shared/auth.js";
import { workingTab } from "./_shared/env.js";
import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { logActivity } from "./_shared/log.js";
import { sendEmail } from "./_shared/mail.js";
import { isEmail, plain, STATUS } from "./_shared/schema.js";
import { assertColumns, readTab, updateFields } from "./_shared/store.js";
import { SUBJECTS, TEMPLATES } from "./_shared/templates.js";
import { performSend } from "./_shared/workflow.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const denied = assertAccess(req);
  if (denied) return denied;

  try {
    const body = await readJson(req);
    const tutorEmail = plain(body.tutorEmail);
    const tutorName = plain(body.tutorName);
    if (!tutorEmail || !tutorName) return json({ error: "Missing tutorEmail or tutorName" }, 400);
    if (!isEmail(tutorEmail)) return json({ error: "Tutor email is not valid" }, 400);

    const tab = workingTab();
    const sheet = await readTab(tab);
    assertColumns(tab, sheet.columns, ["status", "note"]);
    const rowNumber = Number(body.rowNumber);
    const row = sheet.records.find((record) => record._rowNumber === rowNumber);
    if (!row) return json({ error: "That class row is no longer on the sheet" }, 404);

    const stamp = `ICA reminder sent ${new Date().toISOString().slice(0, 10)}`;
    const note = row.note ? `${row.note} | ${stamp}` : stamp;
    const message = {
      to: tutorEmail,
      subject: SUBJECTS.ica,
      body: TEMPLATES.icaReminder({ name: tutorName }),
    };
    const outcome = await performSend({
      action: "send-ica-reminder",
      message,
      send: () => sendEmail(message),
      applySheet: () =>
        updateFields(tab, [
          { rowNumber, field: "status", value: STATUS.notInProgress },
          { rowNumber, field: "note", value: note },
        ]),
      log: logActivity,
    });
    if (!outcome.ok) return json({ ...outcome, sent: false }, outcome.emailSent ? 200 : 502);
    return json({ sent: true, to: tutorEmail });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not send the ICA reminder" }, err.status || 500);
  }
};

export const config = {
  path: "/api/ica-reminder",
  method: "POST",
};
