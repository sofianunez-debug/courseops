import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { requireOperator } from "./_shared/operator.js";
import { postSheet } from "./_shared/sheet-client.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const auth = await requireOperator();
  if (auth.error) return auth.error;
  try {
    const body = await readJson(req);
    const rowNumber = Number(body.rowNumber);
    const tutorEmail = String(body.tutorEmail || "").trim();
    const tutorName = String(body.tutorName || "").trim();
    if (!rowNumber || !tutorEmail) return json({ error: "Choose a tutor for this sub request." }, 400);
    const cells = { "Tutor Name": tutorName, Email: tutorEmail };
    if (body.confirm === true) cells.Status = "Assigned";
    else if (body.confirm !== "assign") cells.Status = "Offered";
    await postSheet("update", { tab: "Subs", rowNumber, cells });
    if (body.confirm === true || body.confirm === "assign") {
      return json({
        sent: true,
        to: tutorEmail,
        message:
          body.confirm === "assign"
            ? `${tutorName || "Tutor"} saved on the sub row. Mail was not sent.`
            : `${tutorName || "Tutor"} is confirmed. Add them in the Course UI.`,
      });
    }
    const result = await postSheet("sendSubs", { rowNumber });
    return json({ sent: true, to: tutorEmail, ...result });
  } catch (err) {
    return json({ error: err.message || "Could not update the sub request" }, err.status || 500);
  }
};

export const config = {
  path: "/api/sub-request",
  method: "POST",
};
