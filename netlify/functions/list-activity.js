import { assertAccess } from "./_shared/auth.js";
import { logTab } from "./_shared/env.js";
import { json, methodNotAllowed } from "./_shared/http.js";
import { readTab } from "./_shared/store.js";

export default async (req) => {
  if (req.method !== "GET") return methodNotAllowed();
  const denied = assertAccess(req);
  if (denied) return denied;

  try {
    const { records } = await readTab(logTab());
    const entries = records
      .map((record) => ({
        timestamp: record.timestamp || "",
        action: record.action || "",
        status: record.status || "",
        recipient: record.recipient || "",
        detail: record.detail || "",
        error: record.error || "",
      }))
      .reverse()
      .slice(0, 50);
    return json({ entries });
  } catch (err) {
    if (/not found|unable to parse range/i.test(String(err.message))) {
      return json({
        entries: [],
        warning: "Activity Log tab does not exist yet. It will be created on the first send.",
      });
    }
    console.error(err);
    return json({ error: err.message || "Could not load activity" }, err.status || 500);
  }
};

export const config = {
  path: "/api/activity",
  method: "GET",
};
