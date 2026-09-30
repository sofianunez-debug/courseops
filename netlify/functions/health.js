import { aiEnabled } from "./_shared/match-reasons.js";
import { env } from "./_shared/env.js";
import { json, methodNotAllowed } from "./_shared/http.js";

export default async (req) => {
  if (req.method !== "GET") return methodNotAllowed();
  const sheetConnected = Boolean(env("SHEET_WEBAPP_URL"));
  return json({
    mode: sheetConnected ? "live" : "preview",
    slackConfigured: Boolean(env("SLACK_WEBHOOK_URL")),
    sheetConnected,
    aiEnabled: aiEnabled(),
    testWorkbook: env("GITHUB_PATH") || "data/workbook-test.json",
  });
};

export const config = {
  path: "/api/health",
  method: "GET",
};
