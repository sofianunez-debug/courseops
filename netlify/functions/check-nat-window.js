import { assertAccess } from "./_shared/auth.js";
import { workingTab } from "./_shared/env.js";
import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { logActivity } from "./_shared/log.js";
import { notifySlack } from "./_shared/mail.js";
import { assertColumns, readTab } from "./_shared/store.js";
import { selectNatWindow } from "./_shared/workflow.js";

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
    const denied = assertAccess(req);
    if (denied) return denied;
  }

  try {
    const tab = workingTab();
    const sheet = await readTab(tab);
    assertColumns(tab, sheet.columns, ["className", "status"]);
    const classes = selectNatWindow(sheet.records);
    let slackPosted = false;
    let slackSkipped = true;
    let slackWarning = null;

    if (classes.length > 0) {
      const lines = classes
        .map((item) => `• ${item.className} — starts in ${item.daysUntilStart} day(s), tutor: ${item.tutorName}`)
        .join("\n");
      try {
        const slack = await notifySlack(`*NAT/placement creation needed within 30 days:*\n${lines}`);
        slackPosted = slack.posted;
        slackSkipped = slack.skipped;
      } catch (err) {
        slackWarning = err.message;
        slackSkipped = false;
        console.error(err);
      }
    }

    await logActivity({
      action: "check-nat-window",
      status: slackWarning ? "failed" : "ok",
      recipient: "",
      detail:
        classes.length === 0
          ? "No accepted classes start within 30 days."
          : classes.map((item) => `${item.className} (${item.daysUntilStart}d)`).join(", "),
      error: slackWarning || "",
    });

    return json({ flagged: classes.length, classes, slackPosted, slackSkipped, slackWarning });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not check the NAT window" }, err.status || 500);
  }
};

export const config = {
  path: "/api/nat-window",
  method: "POST",
  schedule: "0 13 * * *",
};
