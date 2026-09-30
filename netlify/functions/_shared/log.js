import { notifySlack } from "./mail.js";

export async function logActivity({ action, status, recipient = "", detail = "", error = "" }) {
  const entry = { timestamp: new Date().toISOString(), action, status, recipient, detail, error };
  console.log(JSON.stringify(entry));
  if (status === "failed" || status === "partial") {
    try {
      await notifySlack(`*Staffing desk ${status}* — ${action}\n${recipient || "no recipient"}\n${error || detail}`);
    } catch (err) {
      console.error("Slack notification failed:", err);
    }
  }
  return entry;
}
