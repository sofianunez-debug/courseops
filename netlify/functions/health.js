import { env, isPreviewMode, previewHintVisible } from "./_shared/env.js";
import { json, methodNotAllowed } from "./_shared/http.js";
import { CANONICAL, STATUS } from "./_shared/schema.js";
import { TEMPLATES } from "./_shared/templates.js";

export default async (req) => {
  if (req.method !== "GET") return methodNotAllowed();
  const preview = isPreviewMode();
  return json({
    mode: preview ? "preview" : "live",
    previewHint: previewHintVisible(),
    slackConfigured: Boolean(env("SLACK_WEBHOOK_URL")) && !preview,
    columns: CANONICAL,
    statuses: STATUS,
    generalInquiry: TEMPLATES.generalInquiry(),
  });
};

export const config = {
  path: "/api/health",
  method: "GET",
};
