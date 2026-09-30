import { loadDesk } from "./_shared/desk.js";
import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { logActivity } from "./_shared/log.js";
import { notifySlack } from "./_shared/mail.js";
import { requireOperator } from "./_shared/operator.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  let body = {};
  try {
    body = await readJson(req);
  } catch (err) {
    return json({ error: err.message }, err.status || 400);
  }
  const scheduled = typeof body.next_run === "string";
  if (!scheduled) {
    const auth = await requireOperator();
    if (auth.error) return auth.error;
  }
  try {
    const desk = await loadDesk();
    const classes = desk.nat;
    let slackPosted = false;
    let slackSkipped = true;
    let slackWarning = null;
    if (classes.length > 0) {
      const lines = classes
        .map((item) => `• ${item.className} — starts in ${item.daysUntilStart} day(s), tutor: ${item.tutorName || "unassigned"}`)
        .join("\n");
      try {
        const slack = await notifySlack(`*NAT/placement creation needed within 30 days:*\n${lines}`);
        slackPosted = slack.posted;
        slackSkipped = slack.skipped;
      } catch (err) {
        slackWarning = err.message;
        slackSkipped = false;
      }
    }
    await logActivity({
      action: "check-nat-window",
      status: slackWarning ? "failed" : "ok",
      detail: classes.length === 0 ? "Nothing is due in the next 30 days." : `${classes.length} classes`,
      error: slackWarning || "",
    });
    return json({ flagged: classes.length, classes, slackPosted, slackSkipped, slackWarning });
  } catch (err) {
    return json({ error: err.message || "Could not check the NAT window" }, err.status || 500);
  }
};

export const config = {
  schedule: "0 13 * * *",
};
