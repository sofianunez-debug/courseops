import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { requireOperator } from "./_shared/operator.js";
import { postSheet } from "./_shared/sheet-client.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const auth = await requireOperator();
  if (auth.error) return auth.error;
  try {
    const body = await readJson(req);
    const email = String(body.email || "").trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Enter a valid email for test mail." }, 400);
    }
    const result = await postSheet("setTestRecipient", { email });
    return json({ ok: true, testRecipient: email, ...result });
  } catch (err) {
    return json({ error: err.message || "Could not save the test recipient" }, err.status || 500);
  }
};

export const config = {
  path: "/api/test-recipient",
  method: "POST",
};
