import { assertAccess } from "./_shared/auth.js";
import { isPreviewMode } from "./_shared/env.js";
import { json, methodNotAllowed } from "./_shared/http.js";
import { resetStore } from "./_shared/store.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const denied = assertAccess(req);
  if (denied) return denied;
  if (!isPreviewMode()) return json({ error: "Reset is only available in preview mode" }, 403);
  try {
    await resetStore();
    return json({ reset: true });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not reset sample data" }, 500);
  }
};

export const config = {
  path: "/api/reset",
  method: "POST",
};
