import { json, methodNotAllowed } from "./_shared/http.js";
import { requireOperator } from "./_shared/operator.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const auth = await requireOperator();
  if (auth.error) return auth.error;
  return json({ ok: true, reloaded: true });
};

export const config = {
  path: "/api/reset",
  method: "POST",
};
