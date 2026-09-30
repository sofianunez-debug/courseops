import { env } from "./env.js";

export async function notifySlack(text) {
  const url = env("SLACK_WEBHOOK_URL");
  if (!url) return { posted: false, skipped: true };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    const error = new Error(`Slack returned ${response.status}`);
    error.status = 502;
    throw error;
  }
  return { posted: true, skipped: false };
}
