import { json, methodNotAllowed } from "./_shared/http.js";
import { logActivity } from "./_shared/log.js";
import { requireOperator } from "./_shared/operator.js";
import { postSheet } from "./_shared/sheet-client.js";

export default async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  const auth = await requireOperator();
  if (auth.error) return auth.error;
  try {
    const result = await postSheet("sendOffers");
    const count = Number(result.sent) || 0;
    await logActivity({
      action: "send-offers",
      status: "ok",
      detail: result.message || `Sent ${count}`,
    });
    return json({
      sent: Array.from({ length: count }, (_item, index) => ({ index })),
      failed: [],
      message: result.message || "",
    });
  } catch (err) {
    await logActivity({ action: "send-offers", status: "failed", error: err.message });
    return json({ error: err.message || "Could not send offers" }, err.status || 500);
  }
};

export const config = {
  path: "/api/offers",
  method: "POST",
};
