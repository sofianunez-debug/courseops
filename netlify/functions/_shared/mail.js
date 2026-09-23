import { env, isPreviewMode } from "./env.js";
import { plain } from "./schema.js";

function serviceAccount() {
  const raw = env("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
}

export function buildRawMessage({ to, subject, body }) {
  const from = plain(env("GROUP_TUTORS_EMAIL") || "grouptutors@varsitytutors.com");
  const message = [
    `From: ${from}`,
    `To: ${plain(to)}`,
    `Subject: ${plain(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sendViaGmail({ to, subject, body }) {
  const sender = env("GROUP_TUTORS_EMAIL");
  if (!sender) throw new Error("GROUP_TUTORS_EMAIL is not set");
  const { google } = await import("googleapis");
  const creds = serviceAccount();
  const auth = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ["https://www.googleapis.com/auth/gmail.send"],
    sender
  );
  await auth.authorize();
  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawMessage({ to, subject, body }) },
  });
}

export async function sendEmail(message) {
  if (isPreviewMode()) return { delivered: false, preview: true };
  await sendViaGmail(message);
  return { delivered: true, preview: false };
}

export async function notifySlack(text) {
  const url = env("SLACK_WEBHOOK_URL");
  if (!url || isPreviewMode()) return { posted: false, skipped: true };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`Slack webhook returned ${response.status}`);
  }
  return { posted: true, skipped: false };
}
