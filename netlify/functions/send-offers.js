import { assertAccess } from "./_shared/auth.js";
import { isPreviewMode, workingTab } from "./_shared/env.js";
import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { logActivity } from "./_shared/log.js";
import { sendEmail } from "./_shared/mail.js";
import { assertColumns, readTab, updateFields } from "./_shared/store.js";
import { STATUS } from "./_shared/schema.js";
import { buildOfferBatches, deliverOfferBatches } from "./_shared/workflow.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const denied = assertAccess(req);
  if (denied) return denied;

  try {
    const body = await readJson(req);
    const tab = workingTab();
    const { records, columns } = await readTab(tab);
    assertColumns(tab, columns, ["className", "email", "status"]);
    const { batches, skipped } = buildOfferBatches(records);
    let simulated = false;
    const result = await deliverOfferBatches(batches, {
      async send(message, batch) {
        if (isPreviewMode() && body.simulateFailure && !simulated) {
          simulated = true;
          const error = new Error(
            `Simulated failure before emailing ${batch.tutorName || batch.email}. Status was left as Offer.`
          );
          throw error;
        }
        return sendEmail(message);
      },
      markWaiting(batch) {
        return updateFields(
          tab,
          batch.classes.map((item) => ({
            rowNumber: item.rowNumber,
            field: "status",
            value: STATUS.waiting,
          }))
        );
      },
      log: logActivity,
    });
    return json({ ...result, skipped });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not send offers" }, err.status || 500);
  }
};

export const config = {
  path: "/api/offers",
  method: "POST",
};
