/** Rules shared with scripts/sheet-email/Code.gs and scripts/sheet-sync/Code.gs. */

export const LIVE_OFFER_WEBHOOK =
  "https://hook.us1.make.celonis.com/cfs2lf9la8zv98vxqxo43d8f0acd5l9a";
export const LIVE_AVAILABILITY_WEBHOOK =
  "https://hook.us1.make.celonis.com/bk1l8gd6rlvkhcruf4it6s3hltwh46b4";
export const TEST_OFFER_WEBHOOK =
  "https://hook.us1.make.celonis.com/oxwi9afa54a7cg61e2aqoqq8tl7uql4e";

export const LIVE_WEBHOOKS = new Set([LIVE_OFFER_WEBHOOK, LIVE_AVAILABILITY_WEBHOOK]);

export const PRODUCTION_WORKBOOK_PATH = "data/workbook.json";
export const TEST_WORKBOOK_PATH = "data/workbook-test.json";

export function titleLooksLikeTestCopy(title) {
  return /copy of|test/i.test(String(title || ""));
}

export function isTestCopy({ title = "", testCopy = false, testCopyProperty = "" } = {}) {
  if (titleLooksLikeTestCopy(title)) return true;
  if (testCopy === true) return true;
  return String(testCopyProperty || "").trim().toLowerCase() === "yes";
}

/** A test copy publishes only to the test file. */
export function publishPath({ title, testCopy, testCopyProperty, configuredPath }) {
  if (!isTestCopy({ title, testCopy, testCopyProperty })) {
    return configuredPath || PRODUCTION_WORKBOOK_PATH;
  }
  const path = configuredPath && configuredPath !== PRODUCTION_WORKBOOK_PATH
    ? configuredPath
    : TEST_WORKBOOK_PATH;
  if (path === PRODUCTION_WORKBOOK_PATH) {
    throw new Error("A test copy cannot publish over data/workbook.json.");
  }
  return path;
}

/**
 * Test copies send only when sending is explicitly allowed and the URL is not a live webhook.
 * Offer sends must use the Make clone webhook.
 */
export function assertSendAllowed({
  title,
  testCopy,
  testCopyProperty,
  allowSend,
  webhook,
  kind = "offer",
}) {
  const copy = isTestCopy({ title, testCopy, testCopyProperty });
  const url = String(webhook || "").trim();
  if (!copy) {
    if (!url) throw new Error("The webhook URL is not set on the script.");
    return url;
  }
  if (String(allowSend || "").trim().toLowerCase() !== "yes") {
    throw new Error(
      "This copy does not send. Set ALLOW_SEND_FROM_COPY to yes after the Make clone points at this spreadsheet.",
    );
  }
  if (!url || LIVE_WEBHOOKS.has(url)) {
    throw new Error("This copy must not call the live Make webhooks.");
  }
  if (kind === "offer" && url !== TEST_OFFER_WEBHOOK) {
    throw new Error("Offer sends from this copy must use the Make clone webhook.");
  }
  return url;
}

/** Test mail goes to the saved recipient. Sheet cells are not changed. */
export function outgoingInstructor(originalEmail, { title, testCopy, testCopyProperty, testRecipient, activeUser }) {
  const original = String(originalEmail || "").trim();
  if (!isTestCopy({ title, testCopy, testCopyProperty })) {
    return { instructorEmail: original, originalInstructorEmail: "" };
  }
  const recipient = String(testRecipient || "").trim() || String(activeUser || "").trim();
  if (!recipient) {
    throw new Error("Save a test recipient before sending from this copy.");
  }
  return { instructorEmail: recipient, originalInstructorEmail: original };
}
