import { timingSafeEqual } from "node:crypto";
import { accessKey } from "./env.js";
import { json } from "./http.js";

function keysMatch(provided, expected) {
  const left = Buffer.from(String(provided ?? ""));
  const right = Buffer.from(String(expected ?? ""));
  if (left.length !== right.length) {
    timingSafeEqual(right, right);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function assertAccess(req) {
  const expected = accessKey();
  if (!expected) {
    return json({ error: "DASHBOARD_ACCESS_KEY is not configured" }, 500);
  }
  const provided = req.headers.get("x-dashboard-key");
  if (!keysMatch(provided, expected)) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null;
}
