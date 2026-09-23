import fs from "node:fs/promises";
import path from "node:path";
import { env, isPreviewMode } from "./env.js";
import { createSeed } from "./sample-data.js";
import { headerToField, missingFields, normalizeRecords, quoteTab } from "./schema.js";

let queue = Promise.resolve();

function locked(fn) {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function storePath() {
  if (env("STORE_PATH")) return env("STORE_PATH");
  return path.join(process.cwd(), "data", "store.json");
}

async function saveStore(store) {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, file);
}

async function loadStore() {
  try {
    return JSON.parse(await fs.readFile(storePath(), "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    const seed = createSeed();
    await saveStore(seed);
    return seed;
  }
}

function requireTab(store, tabName) {
  const tab = store.tabs?.[tabName];
  if (!tab || !Array.isArray(tab.headers) || !Array.isArray(tab.rows)) {
    throw new Error(`Tab not found: ${tabName}`);
  }
  return tab;
}

function fieldIndex(headers, field) {
  return headers.findIndex((header) => headerToField(header) === field);
}

async function readTabPreview(tabName) {
  const store = await loadStore();
  const tab = requireTab(store, tabName);
  return normalizeRecords(tab.headers, tab.rows);
}

async function updateFieldsPreview(tabName, updates) {
  const store = await loadStore();
  const tab = requireTab(store, tabName);
  const staged = tab.rows.map((row) => [...row]);
  for (const update of updates) {
    const index = fieldIndex(tab.headers, update.field);
    if (index === -1) throw new Error(`${tabName} tab has no column for ${update.field}`);
    const rowIndex = update.rowNumber - 2;
    if (!staged[rowIndex]) throw new Error(`Row ${update.rowNumber} was not found on ${tabName}`);
    staged[rowIndex][index] = update.value;
  }
  tab.rows = staged;
  await saveStore(store);
}

async function appendRowPreview(tabName, valuesByHeader) {
  const store = await loadStore();
  const tab = requireTab(store, tabName);
  tab.rows.push(tab.headers.map((header) => valuesByHeader[header] ?? ""));
  await saveStore(store);
}

export async function readTab(tabName) {
  if (!isPreviewMode()) return readTabLive(tabName);
  return locked(() => readTabPreview(tabName));
}

export async function updateFields(tabName, updates) {
  if (!updates.length) return;
  if (!isPreviewMode()) return updateFieldsLive(tabName, updates);
  return locked(() => updateFieldsPreview(tabName, updates));
}

export async function appendRow(tabName, valuesByHeader) {
  if (!isPreviewMode()) return appendRowLive(tabName, valuesByHeader);
  return locked(() => appendRowPreview(tabName, valuesByHeader));
}

export async function resetStore() {
  if (!isPreviewMode()) {
    throw new Error("Reset is only available in preview mode");
  }
  return locked(async () => {
    await saveStore(createSeed());
  });
}

export function assertColumns(tabName, columns, fields) {
  const missing = missingFields(columns, fields);
  if (missing.length) {
    const error = new Error(`${tabName} tab is missing columns: ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }
}

function serviceAccount() {
  const raw = env("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
}

async function sheetsClient() {
  const { google } = await import("googleapis");
  const creds = serviceAccount();
  const auth = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

function spreadsheetId() {
  const id = env("SHEET_ID");
  if (!id) throw new Error("SHEET_ID is not set");
  return id;
}

async function readTabLive(tabName) {
  const sheets = await sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${quoteTab(tabName)}!A1:Z2000`,
  });
  const rows = res.data.values || [];
  if (rows.length === 0) return normalizeRecords([], []);
  const [headers, ...body] = rows;
  return normalizeRecords(headers, body);
}

async function updateFieldsLive(tabName, updates) {
  const { headers, columns } = await readTabLive(tabName);
  const data = updates.map((update) => {
    const letter = columns[update.field];
    if (!letter) throw new Error(`${tabName} tab has no column for ${update.field}`);
    return {
      range: `${quoteTab(tabName)}!${letter}${update.rowNumber}`,
      values: [[update.value]],
    };
  });
  const sheets = await sheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: { valueInputOption: "RAW", data },
  });
  return headers;
}

const LOG_HEADERS = ["Timestamp", "Action", "Status", "Recipient", "Detail", "Error"];

async function ensureTab(sheets, tabName, headers) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: spreadsheetId() });
  const exists = (meta.data.sheets || []).some((sheet) => sheet.properties?.title === tabName);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${quoteTab(tabName)}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
}

async function appendRowLive(tabName, valuesByHeader) {
  const sheets = await sheetsClient();
  let headers;
  try {
    const existing = await readTabLive(tabName);
    headers = existing.headers.length ? existing.headers : LOG_HEADERS;
  } catch (err) {
    if (!/not found|unable to parse range/i.test(String(err.message))) throw err;
    headers = LOG_HEADERS;
    await ensureTab(sheets, tabName, headers);
  }
  if (!headers.length) {
    headers = Object.keys(valuesByHeader);
    await ensureTab(sheets, tabName, headers);
  }
  const row = headers.map((header) => valuesByHeader[header] ?? "");
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${quoteTab(tabName)}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
