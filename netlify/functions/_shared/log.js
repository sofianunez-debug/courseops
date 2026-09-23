import { logTab } from "./env.js";
import { notifySlack } from "./mail.js";
import { appendRow } from "./store.js";

export async function logActivity({ action, status, recipient = "", detail = "", error = "" }) {
  try {
    await appendRow(logTab(), {
      Timestamp: new Date().toISOString(),
      Action: action,
      Status: status,
      Recipient: recipient,
      Detail: detail,
      Error: error,
    });
  } catch (err) {
    console.error("Activity log failed:", err);
    return err.message;
  }

  if (status === "failed" || status === "partial") {
    try {
      await notifySlack(`*Staffing desk ${status}* — ${action}\n${recipient || "no recipient"}\n${error || detail}`);
    } catch (err) {
      console.error("Slack notification failed:", err);
    }
  }
  return null;
}
