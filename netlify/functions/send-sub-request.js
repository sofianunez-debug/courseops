import { assertAccess } from "./_shared/auth.js";
import { subsTab } from "./_shared/env.js";
import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { logActivity } from "./_shared/log.js";
import { sendEmail } from "./_shared/mail.js";
import { plain, STATUS } from "./_shared/schema.js";
import { assertColumns, readTab, updateFields } from "./_shared/store.js";
import { SUBJECTS, TEMPLATES } from "./_shared/templates.js";
import { performSend, validateSubRequest } from "./_shared/workflow.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const denied = assertAccess(req);
  if (denied) return denied;

  try {
    const body = await readJson(req);
    const problem = validateSubRequest(body);
    if (problem) return json({ error: problem }, 400);

    const tab = subsTab();
    const sheet = await readTab(tab);
    assertColumns(tab, sheet.columns, ["status", "note"]);
    const row = sheet.records.find((record) => record._rowNumber === Number(body.rowNumber));
    if (!row) return json({ error: "That sub request row is no longer on the sheet" }, 404);
    if (row.status !== STATUS.available && row.status !== "") {
      return json({ error: `This sub is already ${row.status || "closed"}` }, 409);
    }

    const tutorName = plain(body.tutorName) || plain(body.tutorEmail);
    const message = {
      to: plain(body.tutorEmail),
      subject: SUBJECTS.sub(body.className),
      body: TEMPLATES.subRequest(body),
    };
    const outcome = await performSend({
      action: "send-sub-request",
      message,
      send: () => sendEmail(message),
      applySheet: () =>
        updateFields(tab, [
          { rowNumber: Number(body.rowNumber), field: "status", value: STATUS.waiting },
          { rowNumber: Number(body.rowNumber), field: "note", value: `Offered to ${tutorName}` },
        ]),
      log: logActivity,
    });
    if (!outcome.ok) return json({ ...outcome, sent: false }, outcome.emailSent ? 200 : 502);
    return json({ sent: true, to: message.to, tutorName });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not send the sub request" }, err.status || 500);
  }
};

export const config = {
  path: "/api/sub-request",
  method: "POST",
};
