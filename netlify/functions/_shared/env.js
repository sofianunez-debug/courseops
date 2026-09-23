export function env(name) {
  try {
    if (typeof Netlify !== "undefined" && Netlify.env && typeof Netlify.env.get === "function") {
      const value = Netlify.env.get(name);
      if (value != null && value !== "") return value;
    }
  } catch {
    // Outside the Netlify runtime, process.env is the source of truth.
  }
  const fallback = process.env[name];
  if (fallback == null || fallback === "") return undefined;
  return fallback;
}

export function isPreviewMode() {
  const forced = env("DATA_MODE");
  if (forced === "preview") return true;
  if (forced === "live") return false;
  return !env("SHEET_ID") || !env("GOOGLE_SERVICE_ACCOUNT_JSON");
}

export function workingTab() {
  if (isPreviewMode()) return "Working";
  return env("WORKING_TAB_NAME") || "Working";
}

export function subsTab() {
  if (isPreviewMode()) return "Subs";
  return env("SUBS_TAB_NAME") || "Subs";
}

export function instructorsTab() {
  if (isPreviewMode()) return "Instructors";
  return env("INSTRUCTORS_TAB_NAME") || "Instructors";
}

export function logTab() {
  if (isPreviewMode()) return "Activity Log";
  return env("LOG_TAB_NAME") || "Activity Log";
}

export function accessKey() {
  return env("DASHBOARD_ACCESS_KEY") || (isPreviewMode() ? "preview" : undefined);
}

export function previewHintVisible() {
  return isPreviewMode() && accessKey() === "preview";
}
