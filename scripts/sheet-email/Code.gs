/**
 * Menus and Make.com sends for the staffing sheet.
 * Paste into the same Apps Script project as scripts/sheet-sync/Code.gs.
 * This file owns onOpen.
 *
 * The web app calls sendOfferedCourses_ and the other silent senders.
 * Those functions do not call SpreadsheetApp.getUi().
 *
 * Live webhooks stay on the live script only. A copy sends only when
 * ALLOW_SEND_FROM_COPY is yes and the offer webhook is the Make clone.
 */

var LIVE_OFFER_WEBHOOK = "https://hook.us1.make.celonis.com/cfs2lf9la8zv98vxqxo43d8f0acd5l9a";
var LIVE_AVAILABILITY_WEBHOOK = "https://hook.us1.make.celonis.com/bk1l8gd6rlvkhcruf4it6s3hltwh46b4";
var TEST_OFFER_WEBHOOK = "https://hook.us1.make.celonis.com/oxwi9afa54a7cg61e2aqoqq8tl7uql4e";

var COL_COURSE_ID = 0;
var COL_COURSE_NAME = 1;
var COL_START = 2;
var COL_END = 3;
var COL_DAYS = 4;
var COL_TIME = 5;
var COL_DURATION = 6;
var COL_COURSE_TYPE = 10;
var COL_ASSIGN_TO = 16;
var COL_EMAIL = 17;
var COL_STATUS = 18;
var COL_TEMPLATE = 21;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Courseops")
    .addItem("Push update to the app", "pushUpdateToApp")
    .addItem("Add push button", "addPushButton")
    .addItem("Install 10-minute publish", "installPublishTrigger")
    .addToUi();
  SpreadsheetApp.getUi()
    .createMenu("Status Update")
    .addItem("Update New Assignments", "updateNewAssignments")
    .addToUi();
  SpreadsheetApp.getUi()
    .createMenu("Send Email")
    .addItem("Send Offered Courses", "sendOfferedCourses")
    .addItem("Send Availability Form", "sendAvailabilityForm")
    .addItem("Send Sub Requests", "sendSubRequests")
    .addItem("Send ICA Signature", "sendIcaSignature")
    .addItem("Send Conflict Emails", "sendConflictEmails")
    .addToUi();
}

function alert_(message) {
  SpreadsheetApp.getUi().alert(message);
}

function activeEmail_() {
  try {
    return Session.getActiveUser().getEmail() || "";
  } catch (err) {
    return "";
  }
}

function sendOfferedCourses() {
  alert_(sendOfferedCourses_().message);
}

function sendAvailabilityForm() {
  alert_(sendAvailabilityForm_().message);
}

function sendSubRequests() {
  alert_(sendSubRequests_().message);
}

function sendIcaSignature() {
  alert_(sendIcaSignature_().message);
}

function sendConflictEmails() {
  alert_(sendConflictEmails_().message);
}

function updateNewAssignments() {
  alert_(updateNewAssignments_().message);
}

function displayGrid_(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
}

function workingSheet_() {
  var sheet = activeSpreadsheet_().getSheetByName("Working Tab");
  if (!sheet) throw new Error("Working Tab was not found.");
  return sheet;
}

function assertSendAllowed_(webhook, kind) {
  var url = String(webhook || "").trim();
  var live = url === LIVE_OFFER_WEBHOOK || url === LIVE_AVAILABILITY_WEBHOOK;
  if (!isTestCopy_()) {
    if (!url) throw new Error("The webhook URL is not set on the script.");
    return url;
  }
  if (scriptProp_("ALLOW_SEND_FROM_COPY").trim().toLowerCase() !== "yes") {
    throw new Error("This copy does not send. Set ALLOW_SEND_FROM_COPY to yes after the Make clone points at this spreadsheet.");
  }
  if (!url || live) throw new Error("This copy must not call the live Make webhooks.");
  if (kind === "offer" && url !== TEST_OFFER_WEBHOOK) {
    throw new Error("Offer sends from this copy must use the Make clone webhook.");
  }
  return url;
}

function outgoingEmail_(original) {
  var address = String(original || "").trim();
  if (!isTestCopy_()) return { instructorEmail: address, originalInstructorEmail: "" };
  var recipient = scriptProp_("TEST_RECIPIENT").trim() || activeEmail_();
  if (!recipient) throw new Error("Save a test recipient before sending from this copy.");
  return { instructorEmail: recipient, originalInstructorEmail: address };
}

function postWebhook_(url, payload) {
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  });
  var status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error("Make returned " + status + ".");
  }
  return status;
}

function courseFromRow_(row, rowNumber) {
  return {
    courseId: row[COL_COURSE_ID] || "",
    courseName: row[COL_COURSE_NAME] || "",
    start: row[COL_START] || "",
    end: row[COL_END] || "",
    days: row[COL_DAYS] || "",
    time: row[COL_TIME] || "",
    duration: row[COL_DURATION] || "",
    courseType: row[COL_COURSE_TYPE] || "",
    rowNumber: rowNumber,
    templateName: row[COL_TEMPLATE] || "",
  };
}

function sendOfferedCourses_() {
  var url = assertSendAllowed_(scriptProp_("OFFER_WEBHOOK_URL"), "offer");
  var grid = displayGrid_(workingSheet_());
  var groups = {};
  var order = [];
  for (var i = 1; i < grid.length; i++) {
    var row = grid[i];
    var status = String(row[COL_STATUS] || "").trim();
    if (status !== "Offered" && status !== "Offer") continue;
    var email = String(row[COL_EMAIL] || "").trim();
    var name = String(row[COL_ASSIGN_TO] || "").trim();
    if (!email) continue;
    var template = String(row[COL_TEMPLATE] || "").trim();
    var templateName = !template || /offer/i.test(template) ? template || "Offer" : template;
    var key = email.toLowerCase() + "|" + templateName;
    if (!groups[key]) {
      groups[key] = { instructorName: name, originalEmail: email, templateName: templateName, courses: [], rowNumbers: [] };
      order.push(key);
    }
    var course = courseFromRow_(row, i + 1);
    groups[key].courses.push(course);
    groups[key].rowNumbers.push(i + 1);
  }
  var submitter = "";
  try {
    submitter = activeEmail_() || "";
  } catch (err) {
    submitter = "";
  }
  var sent = 0;
  order.forEach(function (key) {
    var group = groups[key];
    var mail = outgoingEmail_(group.originalEmail);
    postWebhook_(url, {
      instructorName: group.instructorName,
      instructorEmail: mail.instructorEmail,
      originalInstructorEmail: mail.originalInstructorEmail,
      courses: group.courses,
      rowNumbers: group.rowNumbers,
      templateName: group.templateName,
      totalCourses: group.courses.length,
      submitterEmail: submitter,
    });
    sent += 1;
  });
  return {
    ok: true,
    sent: sent,
    message: sent === 0 ? "No Offered rows with an email." : "Sent " + sent + " offer post" + (sent === 1 ? "" : "s") + " to Make.",
  };
}

function headerMap_(headers) {
  var map = {};
  headers.forEach(function (header, index) {
    map[String(header || "").trim().toLowerCase()] = index;
  });
  return map;
}

function headerValue_(row, map, name) {
  var index = map[name.toLowerCase()];
  if (index == null) return "";
  return String(row[index] || "").trim();
}

function smallGroupNames_() {
  var names = {};
  var grid = displayGrid_(workingSheet_());
  for (var i = 1; i < grid.length; i++) {
    if (/small\s*group/i.test(String(grid[i][COL_COURSE_TYPE] || ""))) {
      names[String(grid[i][COL_COURSE_NAME] || "").trim().toLowerCase()] = true;
    }
  }
  return names;
}

function sendSubRequests_(onlyRow) {
  var url = assertSendAllowed_(scriptProp_("SUB_WEBHOOK_URL") || scriptProp_("OFFER_WEBHOOK_URL"), "sub");
  var sheet = activeSpreadsheet_().getSheetByName("Subs");
  if (!sheet) throw new Error("Subs tab was not found.");
  var grid = displayGrid_(sheet);
  var map = headerMap_(grid[0] || []);
  var smallGroup = smallGroupNames_();
  var groups = {};
  var order = [];
  for (var i = 1; i < grid.length; i++) {
    var rowNumber = i + 1;
    if (onlyRow && Number(onlyRow) !== rowNumber) continue;
    var row = grid[i];
    var status = headerValue_(row, map, "Status");
    if (status !== "Offered" && status !== "Sub Request") continue;
    var courseName = headerValue_(row, map, "Course Name");
    var courseType = headerValue_(row, map, "Course Type") || headerValue_(row, map, "Type");
    if (/small\s*group/i.test(courseType) || /small\s*group/i.test(courseName) || smallGroup[courseName.toLowerCase()]) continue;
    var email = headerValue_(row, map, "Email");
    if (!email) continue;
    var key = email.toLowerCase();
    if (!groups[key]) {
      groups[key] = {
        instructorName: headerValue_(row, map, "Tutor Name"),
        originalEmail: email,
        courses: [],
        rowNumbers: [],
      };
      order.push(key);
    }
    groups[key].courses.push({
      courseName: courseName,
      date: headerValue_(row, map, "Date"),
      time: headerValue_(row, map, "Time"),
      duration: headerValue_(row, map, "Duration"),
      rowNumber: rowNumber,
    });
    groups[key].rowNumbers.push(rowNumber);
  }
  var sent = 0;
  order.forEach(function (key) {
    var group = groups[key];
    var mail = outgoingEmail_(group.originalEmail);
    postWebhook_(url, {
      instructorName: group.instructorName,
      instructorEmail: mail.instructorEmail,
      originalInstructorEmail: mail.originalInstructorEmail,
      courses: group.courses,
      rowNumbers: group.rowNumbers,
      templateName: "Sub Request",
      totalCourses: group.courses.length,
      submitterEmail: activeEmail_() || "",
    });
    sent += 1;
  });
  return {
    ok: true,
    sent: sent,
    message: sent === 0 ? "No sub rows to send." : "Sent " + sent + " sub post" + (sent === 1 ? "" : "s") + " to Make.",
  };
}

function sendIcaSignature_() {
  var url = assertSendAllowed_(scriptProp_("ICA_WEBHOOK_URL") || scriptProp_("OFFER_WEBHOOK_URL"), "ica");
  var grid = displayGrid_(workingSheet_());
  var groups = {};
  var order = [];
  for (var i = 1; i < grid.length; i++) {
    var status = String(grid[i][COL_STATUS] || "").trim();
    if (status !== "Not in Progress" && status !== "ICA Needed") continue;
    var email = String(grid[i][COL_EMAIL] || "").trim();
    if (!email) continue;
    var key = email.toLowerCase();
    if (!groups[key]) {
      groups[key] = { instructorName: String(grid[i][COL_ASSIGN_TO] || "").trim(), originalEmail: email, courses: [], rowNumbers: [] };
      order.push(key);
    }
    groups[key].courses.push(courseFromRow_(grid[i], i + 1));
    groups[key].rowNumbers.push(i + 1);
  }
  var sent = 0;
  order.forEach(function (key) {
    var group = groups[key];
    var mail = outgoingEmail_(group.originalEmail);
    postWebhook_(url, {
      instructorName: group.instructorName,
      instructorEmail: mail.instructorEmail,
      originalInstructorEmail: mail.originalInstructorEmail,
      courses: group.courses,
      rowNumbers: group.rowNumbers,
      templateName: "ICA Signature",
      totalCourses: group.courses.length,
      submitterEmail: activeEmail_() || "",
    });
    sent += 1;
  });
  return {
    ok: true,
    sent: sent,
    message: sent === 0 ? "No ICA rows to send." : "Sent " + sent + " ICA post" + (sent === 1 ? "" : "s") + " to Make. Status was not changed.",
  };
}

function sendConflictEmails_() {
  var url = assertSendAllowed_(scriptProp_("CONFLICT_WEBHOOK_URL") || scriptProp_("OFFER_WEBHOOK_URL"), "conflict");
  var sheet = activeSpreadsheet_().getSheetByName("Conflicts");
  if (!sheet) throw new Error("Conflicts tab was not found.");
  var grid = displayGrid_(sheet);
  var map = headerMap_(grid[0] || []);
  var statusIndex = map.status;
  var sent = 0;
  for (var i = 1; i < grid.length; i++) {
    var row = grid[i];
    if (headerValue_(row, map, "Status") !== "Conflict") continue;
    var email = headerValue_(row, map, "Email");
    if (!email) continue;
    var mail = outgoingEmail_(email);
    var rowNumber = i + 1;
    postWebhook_(url, {
      instructorName: headerValue_(row, map, "Tutor Name"),
      instructorEmail: mail.instructorEmail,
      originalInstructorEmail: mail.originalInstructorEmail,
      courseName: headerValue_(row, map, "Course Name"),
      conflict: headerValue_(row, map, "Conflict"),
      rowNumber: rowNumber,
      useAi: true,
      templateName: "Conflict Resolution",
      submitterEmail: activeEmail_() || "",
    });
    if (statusIndex != null) sheet.getRange(rowNumber, statusIndex + 1).setValue("Sent");
    sent += 1;
  }
  if (sent > 0) publishWorkbook_(true);
  return {
    ok: true,
    sent: sent,
    message: sent === 0 ? "No Conflict rows to send." : "Sent " + sent + " conflict post" + (sent === 1 ? "" : "s") + " to Make.",
  };
}

function sendAvailabilityForm_() {
  var url = assertSendAllowed_(scriptProp_("AVAILABILITY_WEBHOOK_URL"), "availability");
  var sheet = activeSpreadsheet_().getSheetByName("Instructors");
  if (!sheet) throw new Error("Instructors tab was not found.");
  var grid = displayGrid_(sheet);
  var map = headerMap_(grid[0] || []);
  var sent = 0;
  for (var i = 1; i < grid.length; i++) {
    var email = headerValue_(grid[i], map, "Email") || headerValue_(grid[i], map, "Tutor Email");
    if (!email) continue;
    var mail = outgoingEmail_(email);
    postWebhook_(url, {
      instructorName: headerValue_(grid[i], map, "Tutor Name") || headerValue_(grid[i], map, "Name"),
      instructorEmail: mail.instructorEmail,
      originalInstructorEmail: mail.originalInstructorEmail,
      templateName: "Availability Form",
      submitterEmail: activeEmail_() || "",
    });
    sent += 1;
  }
  return { ok: true, sent: sent, message: sent === 0 ? "No instructors to send." : "Sent " + sent + " availability post" + (sent === 1 ? "" : "s") + " to Make." };
}

function sameCourse_(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function updateNewAssignments_() {
  var monthly = activeSpreadsheet_().getSheetByName("Monthly Classes (NEW)");
  if (!monthly) throw new Error("Monthly Classes (NEW) was not found.");
  var monthlyGrid = displayGrid_(monthly);
  var tutors = {};
  for (var i = 1; i < monthlyGrid.length; i++) {
    var course = String(monthlyGrid[i][0] || "").trim();
    var tutor = String(monthlyGrid[i][10] || "").trim();
    if (course && tutor) tutors[course.toLowerCase()] = tutor;
  }
  var sheet = workingSheet_();
  var grid = displayGrid_(sheet);
  var updated = 0;
  for (var r = 1; r < grid.length; r++) {
    if (String(grid[r][COL_STATUS] || "").trim() !== "NAT in Progress") continue;
    var courseName = String(grid[r][COL_COURSE_NAME] || "").trim();
    var tutorName = "";
    Object.keys(tutors).forEach(function (key) {
      if (!tutorName && sameCourse_(key, courseName)) tutorName = tutors[key];
    });
    if (!tutorName) continue;
    var rowNumber = r + 1;
    sheet.getRange(rowNumber, COL_STATUS + 1).setValue("Assigned");
    if (!String(grid[r][COL_ASSIGN_TO] || "").trim()) {
      sheet.getRange(rowNumber, COL_ASSIGN_TO + 1).setValue(tutorName);
    }
    updated += 1;
  }
  if (updated > 0) publishWorkbook_(true);
  return {
    ok: true,
    updated: updated,
    message: updated === 0 ? "No NAT in Progress rows matched a monthly tutor." : "Marked " + updated + " row" + (updated === 1 ? "" : "s") + " Assigned.",
  };
}
