// Set these to the official check-in point. Keep them aligned with script.js.
const ATTENDANCE_LATITUDE = 14.5995;
const ATTENDANCE_LONGITUDE = 120.9842;
const ATTENDANCE_RADIUS = 100;

// Copy the spreadsheet ID from the spreadsheet URL.
const SPREADSHEET_ID = "PASTE_YOUR_SPREADSHEET_ID_HERE";
const SHEET_NAME = "Attendance";
const EVENT_ATTENDANCE_SHEET_NAME = "Event Attendance";
const GRAPHICS_SCHEDULE_SHEET_NAME = "Graphics Schedule";
const TIME_ZONE = "Asia/Manila";
const HEADERS = ["Name", "Date", "Time", "Latitude", "Longitude", "Distance", "Status", "Main Filler", "Graphics Server", "Server Status"];
const EVENT_ATTENDANCE_HEADERS = ["Event Type", "Date", "Main Filler", "Submitter Distance", "Graphics Server", "Server Status", "Name", "Attendance"];
const GRAPHICS_SCHEDULE_HEADERS = ["Type", "Date Range", "Server Name"];

function doGet() {
  try {
    const sheet = getAttendanceSheet();
    const lastRow = sheet.getLastRow();
    const records = [];

    if (lastRow > 1) {
      const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        const row = rows[index];
        if (!row[0]) continue;
        records.push({
          name: row[0],
          date: row[1],
          time: row[2],
          latitude: Number(row[3]),
          longitude: Number(row[4]),
          distance: Number(row[5]),
          status: row[6],
          mainFiller: row[7] || "",
          graphicsServerName: row[8] || "",
          graphicsServerStatus: row[9] || "",
        });
      }
    }

    const today = Utilities.formatDate(new Date(), TIME_ZONE, "MM/dd/yyyy");
    const dailyMainFiller = findDailyMainFiller(sheet, today);
    const graphicsSchedule = readGraphicsSchedule();
    const eventAttendance = readEventAttendance();
    return jsonResponse({
      success: true,
      records: records,
      eventAttendance: eventAttendance,
      mainFiller: { answered: dailyMainFiller !== "", answer: dailyMainFiller },
      graphicsSchedule: graphicsSchedule,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      code: "SHEETS_UNAVAILABLE",
      message: "Attendance records cannot currently be loaded.",
    });
  }
}

function doPost(event) {
  let data;

  try {
    data = JSON.parse(event.postData.contents);
  } catch (error) {
    return jsonResponse({ success: false, code: "INVALID_REQUEST", message: "Request data is not valid JSON." });
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonResponse({ success: false, code: "INVALID_REQUEST", message: "Attendance details are required." });
  }

  if (data.action === "saveGraphicsSchedule") return saveGraphicsSchedule(data);
  if (data.action === "saveEventAttendance") return saveEventAttendance(data);

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const latitude = data.latitude;
  const longitude = data.longitude;
  const mainFiller = data.mainFiller === "Yes" || data.mainFiller === "No" ? data.mainFiller : "";

  if (!name || name.length > 80) {
    return jsonResponse({ success: false, code: "INVALID_NAME", message: "Enter a name between 1 and 80 characters." });
  }
  if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
    return jsonResponse({ success: false, code: "INVALID_COORDINATES", message: "Valid GPS coordinates are required." });
  }

  // Ignore the distance supplied by the browser. Recalculate it on the server.
  const exactDistance = calculateDistance(latitude, longitude, ATTENDANCE_LATITUDE, ATTENDANCE_LONGITUDE);
  if (exactDistance > ATTENDANCE_RADIUS) {
    return jsonResponse({
      success: false,
      code: "OUTSIDE_RADIUS",
      message: "You are outside the attendance area.",
      distance: Math.round(exactDistance),
      allowedRadius: ATTENDANCE_RADIUS,
    });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getAttendanceSheet();
    const now = new Date();
    const date = Utilities.formatDate(now, TIME_ZONE, "MM/dd/yyyy");
    const time = Utilities.formatDate(now, TIME_ZONE, "hh:mm:ss a");
    const existing = findTodaysAttendance(sheet, name, date);

    if (existing) {
      lock.releaseLock();
      return jsonResponse({
        success: false,
        code: "ALREADY_RECORDED",
        message: `${existing.name} has already recorded attendance today.`,
        attendance: existing,
      });
    }

    if (mainFiller && findDailyMainFiller(sheet, date)) {
      lock.releaseLock();
      return jsonResponse({
        success: false,
        code: "MAIN_FILLER_ALREADY_ANSWERED",
        message: "The Main Filler question has already been answered today.",
      });
    }

    let graphicsServerAssignment = null;
    if (mainFiller) {
      const assignmentDate = Utilities.formatDate(now, TIME_ZONE, "yyyy-MM-dd");
      graphicsServerAssignment = findGraphicsAssignment(assignmentDate);
      if (!graphicsServerAssignment) {
        lock.releaseLock();
        return jsonResponse({
          success: false,
          code: "GRAPHICS_SERVER_NOT_ASSIGNED",
          message: "No Graphics server is assigned for this date.",
        });
      }
    }

    const distance = Math.round(exactDistance);
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, 3).setNumberFormat("@");
    sheet.getRange(nextRow, 4, 1, 3).setNumberFormat("0.########");
    sheet.getRange(nextRow, 7).setNumberFormat("@");
    sheet.getRange(nextRow, 8).setNumberFormat("@");
      sheet.getRange(nextRow, 9, 1, 2).setNumberFormat("@");
    sheet.getRange(nextRow, 1, 1, HEADERS.length).setValues([[
      name, date, time, latitude, longitude, distance, "Present", mainFiller,
      graphicsServerAssignment ? graphicsServerAssignment.serverName : "",
      graphicsServerAssignment ? (mainFiller === "Yes" ? "Present" : "Absent") : "",
    ]]);
    lock.releaseLock();

    return jsonResponse({
      success: true,
      message: "Attendance recorded successfully",
      attendance: {
        name: name,
        date: date,
        time: time,
        distance: distance,
        status: "Present",
        mainFiller: mainFiller,
        graphicsServerName: graphicsServerAssignment ? graphicsServerAssignment.serverName : "",
        graphicsServerStatus: graphicsServerAssignment ? (mainFiller === "Yes" ? "Present" : "Absent") : "",
      },
    });
  } catch (error) {
    try {
      lock.releaseLock();
    } catch (lockError) {
      // The lock may not have been acquired if the service timed out.
    }
    return jsonResponse({
      success: false,
      code: "SHEETS_ERROR",
      message: "Attendance could not be saved. Please try again.",
    });
  }
}

function isValidCoordinate(value, minimum, maximum) {
  return typeof value === "number" && isFinite(value) && value >= minimum && value <= maximum;
}

function calculateDistance(latitude1, longitude1, latitude2, longitude2) {
  const earthRadius = 6371000;
  const toRadians = function (degrees) { return degrees * Math.PI / 180; };
  const latitudeDifference = toRadians(latitude2 - latitude1);
  const longitudeDifference = toRadians(longitude2 - longitude1);
  const haversine =
    Math.sin(latitudeDifference / 2) * Math.sin(latitudeDifference / 2) +
    Math.cos(toRadians(latitude1)) * Math.cos(toRadians(latitude2)) *
    Math.sin(longitudeDifference / 2) * Math.sin(longitudeDifference / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getAttendanceSheet() {
  if (SPREADSHEET_ID === "PASTE_YOUR_SPREADSHEET_ID_HERE") {
    throw new Error("Set SPREADSHEET_ID in Code.gs first.");
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else if (sheet.getRange(1, 1).getDisplayValue() !== HEADERS[0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
    HEADERS.forEach(function (header, index) {
      if (existingHeaders[index] !== header) sheet.getRange(1, index + 1).setValue(header);
    });
  }

  return sheet;
}

function getEventAttendanceSheet() {
  if (SPREADSHEET_ID === "PASTE_YOUR_SPREADSHEET_ID_HERE") {
    throw new Error("Set SPREADSHEET_ID in Code.gs first.");
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(EVENT_ATTENDANCE_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(EVENT_ATTENDANCE_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EVENT_ATTENDANCE_HEADERS);
  } else if (sheet.getRange(1, 1).getDisplayValue() !== EVENT_ATTENDANCE_HEADERS[0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, EVENT_ATTENDANCE_HEADERS.length).setValues([EVENT_ATTENDANCE_HEADERS]);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, EVENT_ATTENDANCE_HEADERS.length).getDisplayValues()[0];
    EVENT_ATTENDANCE_HEADERS.forEach(function (header, index) {
      if (existingHeaders[index] !== header) sheet.getRange(1, index + 1).setValue(header);
    });
  }

  return sheet;
}

function readEventAttendance() {
  const sheet = getEventAttendanceSheet();
  const lastRow = sheet.getLastRow();
  const groupedEntries = new Map();

  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, EVENT_ATTENDANCE_HEADERS.length).getValues();
    rows.forEach(function (row) {
      if (!row || !row[0] || !row[6]) return;
      const eventType = String(row[0] || "").trim();
      const eventDate = String(row[1] || "").trim();
      const mainFiller = String(row[2] || "").trim();
      const graphicsServerName = String(row[4] || "").trim();
      const graphicsServerStatus = String(row[5] || "").trim();
      const attendeeName = String(row[6] || "").trim();
      const attendanceStatus = String(row[7] || "Present").trim();
      const key = `${eventType}|${eventDate}|${mainFiller}|${graphicsServerName}|${graphicsServerStatus}`;
      if (!groupedEntries.has(key)) {
        groupedEntries.set(key, {
          eventType: eventType,
          date: eventDate,
          mainFiller: mainFiller,
          submitterDistance: Number(row[3]) || 0,
          graphicsServerName: graphicsServerName,
          graphicsServerStatus: graphicsServerStatus,
          attendees: [],
        });
      }
      groupedEntries.get(key).attendees.push({
        name: attendeeName,
        status: attendanceStatus,
      });
    });
  }

  return Array.from(groupedEntries.values()).reverse();
}

function saveEventAttendance(data) {
  if (typeof data.eventType !== "string" || !data.eventType.trim()) {
    return jsonResponse({ success: false, code: "INVALID_EVENT", message: "Enter the type of event." });
  }

  const attendees = Array.isArray(data.attendees) ? data.attendees : [];
  if (!attendees.length || attendees.some(function (attendee) { return !attendee || typeof attendee.name !== "string" || !attendee.name.trim(); })) {
    return jsonResponse({ success: false, code: "INVALID_ATTENDEES", message: "Enter a name for each attendee or remove the empty row." });
  }

  const eventType = data.eventType.trim();
  const eventDate = typeof data.date === "string" && data.date ? data.date : Utilities.formatDate(new Date(), TIME_ZONE, "MM/dd/yyyy");
  const mainFiller = data.mainFiller === "Yes" || data.mainFiller === "No" ? data.mainFiller : "No";
  const submitterDistance = Number(data.submitterDistance) || 0;
  const graphicsServerName = typeof data.graphicsServerName === "string" ? data.graphicsServerName.trim() : "";
  const graphicsServerStatus = typeof data.graphicsServerStatus === "string" ? data.graphicsServerStatus.trim() : "";

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getEventAttendanceSheet();
    const rows = attendees.map(function (attendee) {
      const attendeeName = attendee.name.trim();
      const attendeeStatus = ["Present", "Late", "Absent"].includes(attendee.status) ? attendee.status : "Present";
      return [eventType, eventDate, mainFiller, submitterDistance, graphicsServerName, graphicsServerStatus, attendeeName, attendeeStatus];
    });
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, EVENT_ATTENDANCE_HEADERS.length).setValues(rows);
    }
    lock.releaseLock();

    const entry = {
      eventType: eventType,
      date: eventDate,
      mainFiller: mainFiller,
      submitterDistance: submitterDistance,
      graphicsServerName: graphicsServerName,
      graphicsServerStatus: graphicsServerStatus,
      attendees: attendees.map(function (attendee) {
        const attendeeName = attendee.name.trim();
        const attendeeStatus = ["Present", "Late", "Absent"].includes(attendee.status) ? attendee.status : "Present";
        return { name: attendeeName, status: attendeeStatus };
      }),
    };
    return jsonResponse({ success: true, eventAttendance: readEventAttendance(), savedEntry: entry });
  } catch (error) {
    try { lock.releaseLock(); } catch (lockError) {}
    return jsonResponse({ success: false, code: "EVENT_SAVE_ERROR", message: "The event roster could not be saved." });
  }
}

function findTodaysAttendance(sheet, name, date) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const normalizedName = name.trim().toLocaleLowerCase();
  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row[0].trim().toLocaleLowerCase() === normalizedName && row[1] === date) {
      return {
        name: row[0],
        date: row[1],
        time: row[2],
        distance: Number(row[5]),
        status: row[6],
      };
    }
  }

  return null;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function findDailyMainFiller(sheet, date) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "";

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row[1] === date && (row[7] === "Yes" || row[7] === "No")) return row[7];
  }

  return "";
}

function getGraphicsScheduleSheet() {
  if (SPREADSHEET_ID === "PASTE_YOUR_SPREADSHEET_ID_HERE") {
    throw new Error("Set SPREADSHEET_ID in Code.gs first.");
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(GRAPHICS_SCHEDULE_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(GRAPHICS_SCHEDULE_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(GRAPHICS_SCHEDULE_HEADERS);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, GRAPHICS_SCHEDULE_HEADERS.length).getDisplayValues()[0];
    GRAPHICS_SCHEDULE_HEADERS.forEach(function (header, index) {
      if (existingHeaders[index] !== header) sheet.getRange(1, index + 1).setValue(header);
    });
  }
  return sheet;
}

function readGraphicsSchedule() {
  const sheet = getGraphicsScheduleSheet();
  const servers = [];
  const assignments = [];
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, GRAPHICS_SCHEDULE_HEADERS.length).getDisplayValues();
    rows.forEach(function (row) {
      if (row[0] === "Server" && row[2]) servers.push(row[2]);
      if (row[0] === "Assignment" && row[1] && row[2]) {
        const dateRange = row[1].split("|");
        assignments.push({ startDate: dateRange[0], endDate: dateRange[1] || dateRange[0], serverName: row[2] });
      }
    });
  }
  return { servers: servers, assignments: assignments };
}

function findGraphicsAssignment(date) {
  const schedule = readGraphicsSchedule();
  return schedule.assignments.find(function (assignment) { return date >= assignment.startDate && date <= assignment.endDate; }) || null;
}

function saveGraphicsSchedule(data) {
  const servers = Array.isArray(data.servers)
    ? data.servers.filter(function (name) { return typeof name === "string"; }).map(function (name) { return name.trim(); }).filter(Boolean)
    : [];
  const assignments = Array.isArray(data.assignments) ? data.assignments : [];
  const normalizedNames = servers.map(function (name) { return name.toLocaleLowerCase(); });
  if (servers.length > 20 || servers.some(function (name) { return name.length > 60; }) || new Set(normalizedNames).size !== normalizedNames.length) {
    return jsonResponse({ success: false, code: "INVALID_GRAPHICS_ROSTER", message: "Use up to 20 unique server names, each 60 characters or fewer." });
  }
  if (assignments.length > 500) {
    return jsonResponse({ success: false, code: "INVALID_GRAPHICS_ASSIGNMENT", message: "The schedule is limited to 500 date ranges." });
  }

  const validAssignments = [];
  const assignedDates = new Set();
  for (let index = 0; index < assignments.length; index += 1) {
    const assignment = assignments[index];
    if (!assignment || typeof assignment.startDate !== "string" || typeof assignment.endDate !== "string" || typeof assignment.serverName !== "string") {
      return jsonResponse({ success: false, code: "INVALID_GRAPHICS_ASSIGNMENT", message: "Each assignment needs a start date, end date, and server." });
    }
    const parsedStart = new Date(assignment.startDate + "T00:00:00Z");
    const parsedEnd = new Date(assignment.endDate + "T00:00:00Z");
    const startDay = parsedStart.getTime() / 86400000;
    const endDay = parsedEnd.getTime() / 86400000;
    const validStart = /^\d{4}-\d{2}-\d{2}$/.test(assignment.startDate) && isFinite(startDay) && Utilities.formatDate(parsedStart, "UTC", "yyyy-MM-dd") === assignment.startDate;
    const validEnd = /^\d{4}-\d{2}-\d{2}$/.test(assignment.endDate) && isFinite(endDay) && Utilities.formatDate(parsedEnd, "UTC", "yyyy-MM-dd") === assignment.endDate;
    if (!validStart || !validEnd || endDay < startDay || endDay - startDay >= 7 || !servers.includes(assignment.serverName)) {
      return jsonResponse({ success: false, code: "INVALID_GRAPHICS_ASSIGNMENT", message: "Use a valid 1–7 day range and a server from the roster." });
    }
    for (let day = startDay; day <= endDay; day += 1) {
      const assignedDate = new Date(day * 86400000).toISOString().slice(0, 10);
      if (assignedDates.has(assignedDate)) {
        return jsonResponse({ success: false, code: "OVERLAPPING_GRAPHICS_ASSIGNMENT", message: "Only one Graphics server can be assigned to each day." });
      }
      assignedDates.add(assignedDate);
    }
    validAssignments.push({ startDate: assignment.startDate, endDate: assignment.endDate, serverName: assignment.serverName });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getGraphicsScheduleSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, GRAPHICS_SCHEDULE_HEADERS.length).clearContent();
    const values = servers.map(function (name) { return ["Server", "", name]; })
      .concat(validAssignments.map(function (assignment) {
        const dateRange = assignment.startDate === assignment.endDate
          ? assignment.startDate
          : assignment.startDate + "|" + assignment.endDate;
        return ["Assignment", dateRange, assignment.serverName];
      }));
    if (values.length) {
      sheet.getRange(2, 1, values.length, GRAPHICS_SCHEDULE_HEADERS.length).setNumberFormat("@");
      sheet.getRange(2, 1, values.length, GRAPHICS_SCHEDULE_HEADERS.length).setValues(values);
    }
    lock.releaseLock();
    return jsonResponse({ success: true, graphicsSchedule: { servers: servers, assignments: validAssignments } });
  } catch (error) {
    try { lock.releaseLock(); } catch (lockError) {}
    return jsonResponse({ success: false, code: "SCHEDULE_SAVE_ERROR", message: "The Graphics schedule could not be saved." });
  }
}