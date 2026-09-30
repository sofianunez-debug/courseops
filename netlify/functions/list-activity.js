import { json, methodNotAllowed } from "./_shared/http.js";
import { requireOperator } from "./_shared/operator.js";

export default async (req) => {
  if (req.method !== "GET") return methodNotAllowed();
  const auth = await requireOperator();
  if (auth.error) return auth.error;
  return json({
    entries: [],
    warning: "Sends are recorded by Make. This list stays empty.",
  });
};

export const config = {
  path: "/api/activity",
  method: "GET",
};
