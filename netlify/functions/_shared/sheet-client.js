import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env.js";

export function sheetConfig() {
  return {
    webAppUrl: env("SHEET_WEBAPP_URL") || "",
    secret: env("SHEET_PUBLISH_SECRET") || "",
    githubToken: env("GITHUB_TOKEN") || "",
    githubRepo: env("GITHUB_REPO") || "",
    githubBranch: env("GITHUB_BRANCH") || "main",
    githubPath: env("GITHUB_PATH") || "data/workbook-test.json",
    workingTab: env("WORKING_TAB_NAME") || "Working Tab",
  };
}

export async function postSheet(action, extra = {}) {
  const { webAppUrl, secret } = sheetConfig();
  if (!webAppUrl) {
    const error = new Error("The sheet web app is not connected. Set SHEET_WEBAPP_URL on this deploy.");
    error.status = 503;
    throw error;
  }
  const response = await fetch(webAppUrl, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret, action, ...extra }),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const error = new Error(
      "The sheet web app did not return JSON. Redeploy it as Execute as me, Who has access: Anyone. The URL must look like https://script.google.com/macros/s/.../exec.",
    );
    error.status = 502;
    throw error;
  }
  if (!data || typeof data !== "object") {
    const error = new Error("The sheet web app returned an empty response.");
    error.status = 502;
    throw error;
  }
  if (data.error) {
    const error = new Error(data.error);
    error.status = data.status || 502;
    throw error;
  }
  return data;
}

async function readWebApp() {
  const { webAppUrl, secret } = sheetConfig();
  if (!webAppUrl) return null;
  const url = new URL(webAppUrl);
  if (secret) url.searchParams.set("secret", secret);
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const error = new Error(
      "The sheet web app still requires Google sign-in, so Course Ops cannot read it. Redeploy as Anyone and use the script.google.com/macros/s URL.",
    );
    error.status = 502;
    throw error;
  }
  if (data?.error) {
    const error = new Error(data.error);
    error.status = 502;
    throw error;
  }
  return { ...data, source: "webapp" };
}

async function readGithub() {
  const { githubToken, githubRepo, githubBranch, githubPath } = sheetConfig();
  if (!githubToken || !githubRepo || !githubPath) return null;
  const url = `https://api.github.com/repos/${githubRepo}/contents/${githubPath}?ref=${encodeURIComponent(githubBranch)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "courseops",
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`Could not read ${githubPath} from GitHub (${response.status}).`);
    error.status = 502;
    throw error;
  }
  const payload = await response.json();
  const text = Buffer.from(String(payload.content || "").replace(/\n/g, ""), "base64").toString("utf8");
  return { ...JSON.parse(text), source: "github" };
}

async function readLocal() {
  const file = env("WORKBOOK_FILE");
  if (!file) return null;
  const text = await readFile(path.resolve(file), "utf8");
  return { ...JSON.parse(text), source: "file" };
}

export async function loadWorkbook() {
  const warnings = [];
  let workbook = null;
  if (sheetConfig().webAppUrl) {
    try {
      workbook = await readWebApp();
    } catch (err) {
      warnings.push(err.message);
    }
  }
  if (!workbook) {
    try {
      workbook = await readGithub();
    } catch (err) {
      warnings.push(err.message);
    }
  }
  if (!workbook) {
    try {
      workbook = await readLocal();
    } catch (err) {
      warnings.push(err.message);
    }
  }
  if (!workbook) {
    return {
      spreadsheetTitle: "",
      testCopy: false,
      testRecipient: "",
      workingTab: sheetConfig().workingTab,
      tabs: {},
      source: "empty",
      warning: warnings[0] || "No published workbook yet. Push an update from the test copy.",
    };
  }
  workbook.workingTab = workbook.workingTab || sheetConfig().workingTab;
  workbook.warning = warnings[0] || workbook.warning || null;
  return workbook;
}
