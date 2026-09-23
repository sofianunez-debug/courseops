import { assertAccess } from "./_shared/auth.js";
import { instructorsTab, isPreviewMode, subsTab, workingTab } from "./_shared/env.js";
import { json, methodNotAllowed } from "./_shared/http.js";
import { assertColumns, readTab } from "./_shared/store.js";
import { TEMPLATES } from "./_shared/templates.js";
import {
  buildOfferBatches,
  selectIcaBlocked,
  selectInstructors,
  selectNatWindow,
  selectOpenSubs,
} from "./_shared/workflow.js";

export default async (req) => {
  if (req.method !== "GET") return methodNotAllowed();
  const denied = assertAccess(req);
  if (denied) return denied;

  try {
    const workingName = workingTab();
    const subsName = subsTab();
    const instructorsName = instructorsTab();
    const [working, subs] = await Promise.all([readTab(workingName), readTab(subsName)]);
    assertColumns(workingName, working.columns, ["className", "status", "email"]);
    assertColumns(subsName, subs.columns, ["className", "status"]);

    let instructors = [];
    let warning = null;
    try {
      const instructorSheet = await readTab(instructorsName);
      instructors = selectInstructors(instructorSheet.records);
    } catch (err) {
      if (!/not found|unable to parse range/i.test(String(err.message))) throw err;
      warning = `${instructorsName} tab was not found. You can still type a tutor email on a sub request.`;
    }

    return json({
      mode: isPreviewMode() ? "preview" : "live",
      warning,
      offers: buildOfferBatches(working.records),
      openSubs: selectOpenSubs(subs.records),
      icaBlocked: selectIcaBlocked(working.records),
      instructors,
      nat: selectNatWindow(working.records),
      templates: { generalInquiry: TEMPLATES.generalInquiry() },
    });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not load the desk" }, err.status || 500);
  }
};

export const config = {
  path: "/api/pending",
  method: "GET",
};
