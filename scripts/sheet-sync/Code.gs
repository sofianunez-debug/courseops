/**
 * Publishes the staffing workbook and accepts writes from Course Ops.
 * Paste this file into the same Apps Script project as scripts/sheet-email/Code.gs.
 * onOpen lives in the email file. Do not add another onOpen here.
 *
 * Script properties:
 * GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (main), GITHUB_PATH, PUBLISH_SECRET
 * TEST_COPY = yes on the copy only
 * ALLOW_SEND_FROM_COPY = yes on the copy only, after the Make clone points at the copy
 * OFFER_WEBHOOK_URL, AVAILABILITY_WEBHOOK_URL, SUB_WEBHOOK_URL, ICA_WEBHOOK_URL, CONFLICT_WEBHOOK_URL
 * TEST_RECIPIENT is saved from the app. It is not a sheet cell.
 *
 * A spreadsheet whose name contains "Copy of" or "Test", or whose TEST_COPY property is yes,
 * publishes to data/workbook-test.json and never calls the live Make webhooks.
 */

var PRODUCTION_WORKBOOK_PATH = "data/workbook.json";
var TEST_WORKBOOK_PATH = "data/workbook-test.json";
var PUSH_TAB = "Push update";

function scriptProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || "";
}

function setScriptProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function activeSpreadsheet_() {
  var spreadsheet = SpreadsheetApp.getActive();
  if (spreadsheet) return spreadsheet;
  throw new Error("No spreadsheet is bound to this script.");
}

function isTestCopy_() {
  var title = activeSpreadsheet_().getName();
  if (/copy of|test/i.test(title)) return true;
  return scriptProp_("TEST_COPY").trim().toLowerCase() === "yes";
}

function publishPath_() {
  var configured = scriptProp_("GITHUB_PATH");
  if (!isTestCopy_()) return configured || PRODUCTION_WORKBOOK_PATH;
  if (!configured || configured === PRODUCTION_WORKBOOK_PATH) return TEST_WORKBOOK_PATH;
  if (configured === PRODUCTION_WORKBOOK_PATH) {
    throw new Error("A test copy cannot publish over data/workbook.json.");
  }
  return configured;
}

function tabPayload_(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  return {
    headers: values[0] || [],
    rows: values.slice(1),
  };
}

function buildWorkbook_() {
  var spreadsheet = activeSpreadsheet_();
  var tabs = {};
  spreadsheet.getSheets().forEach(function (sheet) {
    if (sheet.getName() === PUSH_TAB) return;
    tabs[sheet.getName()] = tabPayload_(sheet);
  });
  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetTitle: spreadsheet.getName(),
    testCopy: isTestCopy_(),
    testRecipient: scriptProp_("TEST_RECIPIENT"),
    workingTab: "Working Tab",
    tabs: tabs,
  };
}

function workbookText_(payload) {
  return JSON.stringify(payload);
}

function contentHash_(text) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text);
  return Utilities.base64Encode(digest);
}

function githubRequest_(method, path, body) {
  var token = scriptProp_("GITHUB_TOKEN");
  var repo = scriptProp_("GITHUB_REPO");
  if (!token || !repo) throw new Error("Set GITHUB_TOKEN and GITHUB_REPO on the script.");
  var url = "https://api.github.com/repos/" + repo + "/contents/" + path;
  var response = UrlFetchApp.fetch(url, {
    method: method,
    muteHttpExceptions: true,
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "courseops",
    },
    payload: body ? JSON.stringify(body) : undefined,
  });
  var status = response.getResponseCode();
  var text = response.getContentText() || "{}";
  var parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    parsed = { message: text };
  }
  return { status: status, body: parsed };
}

function writeGithub_(text) {
  var path = publishPath_();
  if (isTestCopy_() && path === PRODUCTION_WORKBOOK_PATH) {
    throw new Error("A test copy cannot publish over data/workbook.json.");
  }
  var branch = scriptProp_("GITHUB_BRANCH") || "main";
  var existing = githubRequest_("get", path + "?ref=" + encodeURIComponent(branch));
  var sha = existing.status === 200 ? existing.body.sha : "";
  var content = Utilities.base64Encode(Utilities.newBlob(text).getBytes());
  var result = githubRequest_("put", path, {
    message: "Publish staffing workbook",
    content: content,
    branch: branch,
    sha: sha || undefined,
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error("GitHub publish failed (" + result.status + ").");
  }
  return path;
}

function publishWorkbook_(force) {
  var payload = buildWorkbook_();
  var comparable = workbookText_({
    spreadsheetTitle: payload.spreadsheetTitle,
    testCopy: payload.testCopy,
    testRecipient: payload.testRecipient,
    workingTab: payload.workingTab,
    tabs: payload.tabs,
  });
  var hash = contentHash_(comparable);
  if (!force && scriptProp_("LAST_PUBLISH_HASH") === hash) {
    return { ok: true, skipped: true, path: publishPath_() };
  }
  payload.publishedAt = new Date().toISOString();
  var path = writeGithub_(workbookText_(payload));
  setScriptProp_("LAST_PUBLISH_HASH", hash);
  return { ok: true, skipped: false, path: path, publishedAt: payload.publishedAt };
}

function publishSheetIfChanged() {
  return publishWorkbook_(false);
}

function pushUpdateToApp() {
  var result = publishWorkbook_(true);
  SpreadsheetApp.getUi().alert("Published " + result.path + ".");
}

function installPublishTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "publishSheetIfChanged") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("publishSheetIfChanged").timeBased().everyMinutes(10).create();
  SpreadsheetApp.getUi().alert("Course Ops will publish when the sheet changes, every 10 minutes.");
}

function addPushButton() {
  var spreadsheet = activeSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(PUSH_TAB);
  if (!sheet) sheet = spreadsheet.insertSheet(PUSH_TAB);
  sheet.getRange("A1").setValue("Check the box to push this sheet to Course Ops. This tab is not class data.");
  sheet.getRange("A2").insertCheckboxes();
  sheet.getRange("A2").setValue(false);
  sheet.setColumnWidth(1, 420);
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "onEditPublish") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("onEditPublish").forSpreadsheet(spreadsheet).onEdit().create();
  SpreadsheetApp.getUi().alert("Push update tab is ready. Check the box to publish.");
}

function onEditPublish(event) {
  if (!event || !event.range) return;
  if (event.range.getSheet().getName() !== PUSH_TAB) return;
  if (event.range.getA1Notation() !== "A2") return;
  if (event.range.getValue() !== true) return;
  publishWorkbook_(true);
  event.range.setValue(false);
}

function jsonOut_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function requestSecret_(event) {
  var fromQuery = event && event.parameter ? event.parameter.secret : "";
  return fromQuery || "";
}

function doGet(event) {
  var expected = scriptProp_("PUBLISH_SECRET");
  if (!expected || requestSecret_(event) !== expected) return jsonOut_({ error: "Unauthorized" });
  var payload = buildWorkbook_();
  payload.publishedAt = new Date().toISOString();
  return jsonOut_(payload);
}

function readBody_(event) {
  var raw = event && event.postData ? event.postData.contents : "";
  if (!raw) return {};
  return JSON.parse(raw);
}

function sheetByName_(name) {
  var sheet = activeSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error("Tab not found: " + name);
  return sheet;
}

function headerRow_(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
}

function columnIndex_(headers, key) {
  if (/^\d+$/.test(String(key))) return Number(key);
  var want = String(key || "").trim().toLowerCase();
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i] || "").trim().toLowerCase() === want) return i;
  }
  return -1;
}

function applyUpdate_(body) {
  var sheet = sheetByName_(body.tab || "Working Tab");
  var rowNumber = Number(body.rowNumber);
  if (!rowNumber || rowNumber < 2) throw new Error("rowNumber must be a data row.");
  var headers = headerRow_(sheet);
  var cells = body.cells || {};
  var keys = Object.keys(cells);
  if (keys.length === 0) throw new Error("No cells to update.");
  keys.forEach(function (key) {
    var index = columnIndex_(headers, key);
    if (index < 0) throw new Error("Unknown column: " + key);
    sheet.getRange(rowNumber, index + 1).setValue(cells[key]);
  });
  var published = publishWorkbook_(true);
  return { ok: true, rowNumber: rowNumber, path: published.path };
}

function applyAppend_(body) {
  var sheet = sheetByName_(body.tab || "Working Tab");
  var headers = headerRow_(sheet);
  var cells = body.cells || {};
  var row = headers.map(function (_header, index) {
    if (Object.prototype.hasOwnProperty.call(cells, String(index))) return cells[String(index)];
    var header = headers[index];
    if (header && Object.prototype.hasOwnProperty.call(cells, header)) return cells[header];
    return "";
  });
  sheet.appendRow(row);
  var published = publishWorkbook_(true);
  return { ok: true, rowNumber: sheet.getLastRow(), path: published.path };
}

function setTestRecipient_(body) {
  var email = String(body.email || "").trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid test recipient.");
  setScriptProp_("TEST_RECIPIENT", email);
  var published = publishWorkbook_(true);
  return { ok: true, testRecipient: email, path: published.path };
}

function doPost(event) {
  try {
    var body = readBody_(event);
    var expected = scriptProp_("PUBLISH_SECRET");
    if (!expected || body.secret !== expected) return jsonOut_({ error: "Unauthorized" });
    var action = body.action;
    if (action === "update") return jsonOut_(applyUpdate_(body));
    if (action === "append") return jsonOut_(applyAppend_(body));
    if (action === "setTestRecipient") return jsonOut_(setTestRecipient_(body));
    if (action === "sendOffers") return jsonOut_(sendOfferedCourses_());
    if (action === "sendSubs") return jsonOut_(sendSubRequests_(body.rowNumber));
    if (action === "sendIca") return jsonOut_(sendIcaSignature_());
    if (action === "sendConflicts") return jsonOut_(sendConflictEmails_());
    if (action === "sendAvailability") return jsonOut_(sendAvailabilityForm_());
    return jsonOut_({ error: "Unknown action" });
  } catch (err) {
    return jsonOut_({ error: err && err.message ? err.message : "Sheet update failed" });
  }
}
