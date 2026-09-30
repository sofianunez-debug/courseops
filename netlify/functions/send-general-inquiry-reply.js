import { json, methodNotAllowed, readJson } from "./_shared/http.js";
import { requireOperator } from "./_shared/operator.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const auth = await requireOperator();
  if (auth.error) return auth.error;
  await readJson(req);
  return json(
    { error: "Course Ops does not send this reply. Make.com sends the staffing mail." },
    400,
  );
};

export const config = {
  path: "/api/inquiry",
  method: "POST",
};
