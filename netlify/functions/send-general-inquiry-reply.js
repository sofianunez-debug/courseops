import { assertAccess } from "./_shared/auth.js";
import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { logActivity } from "./_shared/log.js";
import { sendEmail } from "./_shared/mail.js";
import { plain } from "./_shared/schema.js";
import { SUBJECTS, TEMPLATES } from "./_shared/templates.js";
import { performSend, validateInquiry } from "./_shared/workflow.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const denied = assertAccess(req);
  if (denied) return denied;

  try {
    const body = await readJson(req);
    const problem = validateInquiry(body);
    if (problem) return json({ error: problem }, 400);
    const tutorEmail = plain(body.tutorEmail);
    const message = {
      to: tutorEmail,
      subject: SUBJECTS.inquiry,
      body: TEMPLATES.generalInquiry(),
    };
    const outcome = await performSend({
      action: "send-general-inquiry-reply",
      message,
      send: () => sendEmail(message),
      log: logActivity,
    });
    if (!outcome.ok) return json({ ...outcome, sent: false }, 502);
    return json({ sent: true, to: tutorEmail });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not send the reply" }, err.status || 500);
  }
};

export const config = {
  path: "/api/inquiry",
  method: "POST",
};
