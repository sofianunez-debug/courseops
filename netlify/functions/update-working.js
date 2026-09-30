import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { requireOperator } from "./_shared/operator.js";
import { postSheet } from "./_shared/sheet-client.js";
import { WORKING_COLUMNS } from "./_shared/workbook.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const auth = await requireOperator();
  if (auth.error) return auth.error;
  try {
    const body = await readJson(req);
    const rowNumber = Number(body.rowNumber);
    if (!rowNumber) return json({ error: "Choose a class row." }, 400);
    const cells = {};
    if (body.action === "offer" || body.action === "assign") {
      if (!body.tutorName || !body.tutorEmail) return json({ error: "Choose a tutor before assigning." }, 400);
      cells[String(WORKING_COLUMNS.assignTo)] = body.tutorName;
      cells[String(WORKING_COLUMNS.email)] = body.tutorEmail;
    }
    if (body.action === "offer") cells[String(WORKING_COLUMNS.status)] = "Offered";
    if (body.action === "accept") cells[String(WORKING_COLUMNS.status)] = "NAT in Progress";
    if (body.action === "drop") {
      cells[String(WORKING_COLUMNS.assignTo)] = "";
      cells[String(WORKING_COLUMNS.email)] = "";
      cells[String(WORKING_COLUMNS.status)] = "Offered";
    }
    if (Object.keys(cells).length === 0) return json({ error: "That class update is not supported." }, 400);
    const result = await postSheet("update", { tab: "Working Tab", rowNumber, cells });
    return json({ ok: true, ...result });
  } catch (err) {
    return json({ error: err.message || "Could not update the class" }, err.status || 500);
  }
};

export const config = {
  path: "/api/working",
  method: "POST",
};
