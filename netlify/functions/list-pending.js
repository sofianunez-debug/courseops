import { loadDesk } from "./_shared/desk.js";
import { json, methodNotAllowed } from "./_shared/http.js";
import { requireOperator } from "./_shared/operator.js";

export default async (req) => {
  if (req.method !== "GET") return methodNotAllowed();
  const auth = await requireOperator();
  if (auth.error) return auth.error;
  try {
    return json(await loadDesk());
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not load the desk" }, err.status || 500);
  }
};

export const config = {
  path: "/api/pending",
  method: "GET",
};
