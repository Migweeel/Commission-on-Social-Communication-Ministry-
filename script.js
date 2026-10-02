// Change these three values to match your official attendance location.
const ATTENDANCE_LATITUDE = 14.5792427;
const ATTENDANCE_LONGITUDE = 120.994319;
const ATTENDANCE_RADIUS = 100;
// This is a client-side screen lock, not secure authentication.
const LOCATION_SETTINGS_PASSWORD = "multimedia2026";

// Add a browser key restricted to this site's HTTP referrers after enabling Maps JavaScript API.
const GOOGLE_MAPS_API_KEY = "PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE";

// Paste the deployed Apps Script Web App URL ending in /exec here.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby6B6x1_y28GBQiadt-LUd99JVyjeQxSyUQ7MwCKL2mmFT5i6J_PUB05QnY25bJt6mG/exec";
const LOCATION_STORAGE_KEY = "geoattend-location";
const EVENT_ATTENDANCE_STORAGE_KEY = "ministry-event-attendance";
const ATTENDANCE_DRAFT_STORAGE_KEY = "geoattend-attendance-draft";
const LOCATION_DRAFT_STORAGE_KEY = "geoattend-location-draft";
const EVENT_DRAFT_STORAGE_KEY = "ministry-event-attendance-draft";
const GRAPHICS_SCHEDULE_DRAFT_KEY = "geoattend-graphics-schedule-draft";

function loadEventAttendance() {
  try {
    const saved = JSON.parse(localStorage.getItem(EVENT_ATTENDANCE_STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

async function loadSharedEventAttendance() {
  if (GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    eventAttendanceRecords = loadEventAttendance();
    renderEventAttendance();
    return;
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { cache: "no-store" });
    const result = await response.json();
    if (response.ok && result.success && Array.isArray(result.eventAttendance)) {
      eventAttendanceRecords = result.eventAttendance;
      try {
        localStorage.setItem(EVENT_ATTENDANCE_STORAGE_KEY, JSON.stringify(eventAttendanceRecords));
      } catch (error) {
        // Keep using the server copy if local storage is blocked.
      }
      renderEventAttendance();
      return;
    }
  } catch (error) {
    // Fall back to the local cached data if the shared data cannot be loaded.
  }

  eventAttendanceRecords = loadEventAttendance();
  renderEventAttendance();
}

function loadLocationSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY));
    if (
      saved && typeof saved.name === "string" &&
      Number.isFinite(saved.latitude) && saved.latitude >= -90 && saved.latitude <= 90 &&
      Number.isFinite(saved.longitude) && saved.longitude >= -180 && saved.longitude <= 180 &&
      Number.isFinite(saved.radius) && saved.radius > 0
    ) return saved;
  } catch (error) {
    // Keep using defaults if this browser blocks local storage.
  }

  return {
    name: "Commission on Social Communication Ministry",
    latitude: ATTENDANCE_LATITUDE,
    longitude: ATTENDANCE_LONGITUDE,
    radius: ATTENDANCE_RADIUS,
  };
}

const nameInput = document.getElementById("name");
function readLocalDraft(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (error) {
    return null;
  }
}

function writeLocalDraft(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function removeLocalDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Continue with the current visit if browser storage is unavailable.
  }
}
const nameError = document.getElementById("name-error");
const attendanceMainFillerInput = document.getElementById("attendance-main-filler");
const attendanceMainFillerNote = document.getElementById("attendance-main-filler-note");
const formView = document.getElementById("form-view");
const permissionView = document.getElementById("permission-view");
const loadingView = document.getElementById("loading-view");
const resultView = document.getElementById("result-view");
const checkButton = document.getElementById("check-button");
const checkButtonLabel = document.getElementById("check-button-label");
const submitButton = document.getElementById("submit-button");
const locationStatus = document.getElementById("location-status");
const statusIcon = document.getElementById("status-icon");
const statusTitle = document.getElementById("status-title");
const statusMessage = document.getElementById("status-message");
const locationMetrics = document.getElementById("location-metrics");
const mainContent = document.getElementById("main-content");
const recordsBody = document.getElementById("records-body");
const sheetsStatus = document.getElementById("sheets-status");
const permissionTitle = document.getElementById("permission-title");
const permissionMessage = document.getElementById("permission-message");
const permissionIcon = document.getElementById("permission-icon");
const allowLocationButton = document.getElementById("allow-location-button");
const retryLocationButton = document.getElementById("retry-location-button");
const googleMapCanvas = document.getElementById("google-map");
const mapFallback = document.getElementById("map-fallback");
const mapConnectMessage = document.getElementById("map-connect-message");
const mapInstruction = document.getElementById("map-instruction");
const locationAccess = document.getElementById("location-access");
const locationSettingsContent = document.getElementById("location-settings-content");
const locationPasswordInput = document.getElementById("location-password");
const locationPasswordError = document.getElementById("location-password-error");
const lockLocationButton = document.getElementById("lock-location-button");
const eventAttendees = document.getElementById("event-attendees");
const eventRecordsBody = document.getElementById("event-records-body");
const recordsEventBody = document.getElementById("records-event-body");
const eventError = document.getElementById("event-error");
const eventLocationStatus = document.getElementById("event-location-status");
const eventLocationIcon = document.getElementById("event-location-icon");
const eventLocationTitle = document.getElementById("event-location-title");
const eventLocationMessage = document.getElementById("event-location-message");
const checkEventLocationButton = document.getElementById("check-event-location");
const saveEventAttendanceButton = document.getElementById("save-event-attendance");
const graphicsServerList = document.getElementById("graphics-server-list");
const graphicsAssignmentList = document.getElementById("graphics-assignment-list");
const graphicsScheduleStatus = document.getElementById("graphics-schedule-status");

let attendanceLocation = loadLocationSettings();
let attendanceRecords = [];
let eventAttendanceRecords = loadEventAttendance();
let sheetsConnected = false;
let googleMap = null;
let googleMapMarker = null;
let googleRadiusCircle = null;
let googleMapLoadStarted = false;
let locationSettingsUnlocked = false;
let currentLocation = null;
let verifiedName = "";
let currentDistance = null;
let toastTimer;
let hasRequestedLocation = false;
let eventSubmissionLocation = null;
let eventLocationCheckedAt = 0;
let mainFillerAlreadyAnsweredToday = false;
let graphicsSchedule = { servers: Array(4).fill(""), assignments: [] };
let sharedGraphicsSchedule = { servers: [], assignments: [] };

document.getElementById("radius-value").textContent = `${attendanceLocation.radius} m`;
checkButton.addEventListener("click", checkMyLocation);
allowLocationButton.addEventListener("click", requestBrowserLocation);
retryLocationButton.addEventListener("click", requestBrowserLocation);
document.getElementById("attendance-form").addEventListener("submit", submitAttendance);
attendanceMainFillerInput.addEventListener("change", handleMainFillerChange);
document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});
document.getElementById("location-form").addEventListener("submit", saveLocationSettings);
document.getElementById("location-form").addEventListener("input", saveLocationSettingsDraft);
document.getElementById("location-form").addEventListener("change", saveLocationSettingsDraft);
document.getElementById("location-unlock-form").addEventListener("submit", unlockLocationSettings);
lockLocationButton.addEventListener("click", lockLocationSettings);
document.getElementById("add-graphics-server").addEventListener("click", addGraphicsServer);
document.getElementById("add-graphics-assignment").addEventListener("click", addGraphicsAssignment);
document.getElementById("save-graphics-schedule").addEventListener("click", saveGraphicsSchedule);
graphicsServerList.addEventListener("input", saveGraphicsScheduleDraft);
graphicsServerList.addEventListener("change", () => {
  graphicsSchedule = readGraphicsScheduleForm();
  renderGraphicsAssignments();
  saveGraphicsScheduleDraft();
});
graphicsServerList.addEventListener("click", removeGraphicsServer);
graphicsAssignmentList.addEventListener("input", saveGraphicsScheduleDraft);
graphicsAssignmentList.addEventListener("change", saveGraphicsScheduleDraft);
graphicsAssignmentList.addEventListener("click", removeGraphicsAssignment);
document.getElementById("location-name").addEventListener("input", updateMapPreview);
document.getElementById("location-radius").addEventListener("input", updateMapPreview);
document.getElementById("location-latitude").addEventListener("input", () => {
  updateGoogleMapsLink();
  updateMapPreview();
});
document.getElementById("location-longitude").addEventListener("input", () => {
  updateGoogleMapsLink();
  updateMapPreview();
});
document.getElementById("record-search").addEventListener("input", renderRecords);
document.getElementById("record-date").addEventListener("input", renderRecords);
document.getElementById("record-status").addEventListener("change", renderRecords);
document.getElementById("refresh-records").addEventListener("click", () => void loadRecords());
document.getElementById("export-records").addEventListener("click", exportRecords);
document.getElementById("export-csv").addEventListener("click", exportCsvRecords);
document.getElementById("event-entry-form").addEventListener("submit", saveEventAttendance);
document.getElementById("event-entry-form").addEventListener("input", saveEventAttendanceDraft);
document.getElementById("event-entry-form").addEventListener("change", saveEventAttendanceDraft);
checkEventLocationButton.addEventListener("click", checkEventSubmitterLocation);
document.getElementById("add-attendee").addEventListener("click", addAttendeeRow);
eventAttendees.addEventListener("click", removeAttendeeRow);
document.getElementById("export-event-records").addEventListener("click", exportEventAttendance);
document.getElementById("event-date-display").textContent = getTodayDate();
updateEventLocationReference();
function updateEventLocationReference() {
  document.getElementById("event-location-name").textContent = attendanceLocation.name;
  document.getElementById("event-location-radius").textContent = `Allowed radius: ${attendanceLocation.radius} m`;
  document.getElementById("event-location-map-link").href =
    `https://www.google.com/maps/search/?api=1&query=${attendanceLocation.latitude},${attendanceLocation.longitude}`;
}

populateLocationSettings();
renderRecords();
renderEventAttendance();
restoreAttendanceDraft();
restoreEventAttendanceDraft();
void loadDailyMainFillerStatus();
void loadSharedEventAttendance();

nameInput.addEventListener("input", () => {
  saveAttendanceDraft();
  nameError.textContent = "";

  if (nameInput.value.trim() !== verifiedName) {
    currentLocation = null;
    currentDistance = null;
    verifiedName = "";
    submitButton.disabled = true;
    locationMetrics.hidden = true;
    checkButtonLabel.textContent = "Check My Location";
    setLocationStatus(
      "idle",
      "📍",
      "Location not checked",
      "Your location is required before submitting attendance.",
    );
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lon2 - lon1);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(longitudeDifference / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function loadDailyMainFillerStatus() {
  if (GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR_")) return;

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
    const result = await response.json();
    sharedGraphicsSchedule = normalizeGraphicsSchedule(result.graphicsSchedule);
    mainFillerAlreadyAnsweredToday = Boolean(result.mainFiller && result.mainFiller.answered);
    updateMainFillerAvailability();
    if (mainFillerAlreadyAnsweredToday && attendanceMainFillerInput.value) handleMainFillerChange();
  } catch (error) {
    // The server enforces the daily limit when attendance is submitted.
  }
}

function updateMainFillerAvailability() {
  if (mainFillerAlreadyAnsweredToday) {
    attendanceMainFillerNote.textContent = "This was already answered today. Skip it to submit attendance.";
    attendanceMainFillerNote.classList.add("warning");
    return;
  }

  attendanceMainFillerNote.textContent = "Only one attendee can answer this optional question each day. You can skip it and still submit attendance.";
  attendanceMainFillerNote.classList.remove("warning");
}

function handleMainFillerChange() {
  if (mainFillerAlreadyAnsweredToday && attendanceMainFillerInput.value) {
    window.alert("This optional question has already been answered today. It has been set to Skip; you can still submit attendance.");
    attendanceMainFillerInput.value = "";
  }
  saveAttendanceDraft();
}

function getGraphicsAssignmentForDate(date) {
  return sharedGraphicsSchedule.assignments.find((assignment) =>
    date >= assignment.startDate && date <= assignment.endDate,
  ) || null;
}

function getEventGraphicsServerData(eventRecord) {
  const [month, day, year] = String(eventRecord.date || "").split("/");
  const date = month && day && year ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
  const assignment = getGraphicsAssignmentForDate(date);
  const serverName = eventRecord.graphicsServerName || assignment?.serverName || "";
  const serverStatus = eventRecord.graphicsServerStatus || (serverName
    ? eventRecord.mainFiller === "Yes" ? "Present" : eventRecord.mainFiller === "No" ? "Absent" : ""
    : "");
  return { serverName, serverStatus };
}

function setLocationStatus(kind, icon, title, message) {
  locationStatus.className = `location-status status-${kind}`;
  statusIcon.textContent = icon;
  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

function showView(view) {
  formView.hidden = view !== "form";
  permissionView.hidden = view !== "permission";
  loadingView.hidden = view !== "loading";
  resultView.hidden = view !== "result";
}

function checkMyLocation() {
  const name = nameInput.value.trim();
  nameError.textContent = "";

  if (!name) {
    nameError.textContent = "Please enter your full name first.";
    nameInput.focus();
    return;
  }

  if (name.length > 80) {
    nameError.textContent = "Your name must be 80 characters or fewer.";
    nameInput.focus();
    return;
  }

  verifiedName = name;
  currentLocation = null;
  currentDistance = null;
  submitButton.disabled = true;
  if (hasRequestedLocation) {
    requestBrowserLocation();
    return;
  }

  permissionTitle.textContent = "Location Access Required";
  permissionMessage.textContent = "This attendance system uses your current location to verify that you are within the designated attendance area.";
  permissionIcon.className = "large-symbol permission-symbol";
  permissionIcon.textContent = "📍";
  allowLocationButton.hidden = false;
  retryLocationButton.hidden = true;
  showView("permission");
  allowLocationButton.focus();
}

function requestBrowserLocation() {
  hasRequestedLocation = true;
  if (!navigator.geolocation) {
    showLocationError("This browser does not support location services.");
    return;
  }

  checkButton.disabled = true;
  showView("loading");

  navigator.geolocation.getCurrentPosition(
    handleLocationSuccess,
    handleLocationError,
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

function handleLocationSuccess(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy = Math.max(1, Math.round(position.coords.accuracy));
  const exactDistance = calculateDistance(
    latitude,
    longitude,
    attendanceLocation.latitude,
    attendanceLocation.longitude,
  );
  const distance = Math.round(exactDistance);

  currentLocation = { latitude, longitude, accuracy };
  currentDistance = exactDistance;
  locationMetrics.hidden = false;
  document.getElementById("distance-value").textContent = `${distance} m`;
  document.getElementById("accuracy-value").textContent = `±${accuracy} m`;
  checkButton.disabled = false;
  checkButtonLabel.textContent = "Refresh Location";
  showView("form");

  if (exactDistance <= attendanceLocation.radius) {
    setLocationStatus(
      "verified",
      "🟢",
      "Location Verified",
      "You are within the attendance area.",
    );
    submitButton.disabled = false;
    return;
  }

  setLocationStatus(
    "outside",
    "🔴",
    "Outside Attendance Area",
    `You are ${distance} meters away. You must be within ${attendanceLocation.radius} meters of the attendance location.`,
  );
  submitButton.disabled = true;
}

function handleLocationError(error) {
  checkButton.disabled = false;
  checkButtonLabel.textContent = "Try Again";

  if (error.code === error.PERMISSION_DENIED) {
    permissionTitle.textContent = "Location Permission Denied";
    permissionMessage.textContent = "Please enable location access in your browser settings and try again.";
    permissionIcon.className = "large-symbol warning-symbol";
    permissionIcon.textContent = "🟡";
    allowLocationButton.hidden = true;
    retryLocationButton.hidden = false;
    showView("permission");
    retryLocationButton.focus();
    return;
  }

  if (error.code === error.TIMEOUT) {
    showLocationError("The GPS request timed out. Please check your signal and try again.");
  } else {
    showLocationError("Your location is unavailable. Please make sure location services are enabled.");
  }
}

function showLocationError(message) {
  showView("form");
  submitButton.disabled = true;
  checkButton.disabled = false;
  checkButtonLabel.textContent = "Try Again";
  setLocationStatus("error", "🔴", "Unable to determine your location", message);
}

async function submitAttendance(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  if (!name) {
    nameError.textContent = "Please enter your full name first.";
    nameInput.focus();
    return;
  }
  if (!currentLocation || verifiedName !== name || currentDistance === null) {
    submitButton.disabled = true;
    setLocationStatus("error", "📍", "Location not checked", "Check your current location before submitting.");
    return;
  }
  if (currentDistance > attendanceLocation.radius) {
    submitButton.disabled = true;
    return;
  }
  if (GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    showResultError("Add your Google Apps Script Web App URL to script.js before submitting.", true);
    return;
  }

  submitButton.disabled = true;
  showView("loading");
  document.getElementById("loading-title").textContent = "Recording Attendance...";
  document.getElementById("loading-message").textContent = "Please wait while your attendance is saved.";
  document.getElementById("progress-list").innerHTML = `
    <div class="progress-item complete"><span>✓</span>Name verified</div>
    <div class="progress-item complete"><span>✓</span>Location verified</div>
    <div class="progress-item current"><span>•</span>Recording attendance</div>
  `;

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        name,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        distance: Math.round(currentDistance),
        mainFiller: attendanceMainFillerInput.value,
      }),
    });
    const result = await response.json();

    if (result.code === "MAIN_FILLER_ALREADY_ANSWERED" && attendanceMainFillerInput.value) {
      mainFillerAlreadyAnsweredToday = true;
      updateMainFillerAvailability();
      const skipQuestion = window.confirm("Another attendee has already answered this today. Skip this optional question and submit your attendance?");
      if (skipQuestion) {
        attendanceMainFillerInput.value = "";
        saveAttendanceDraft();
        await submitAttendance(new Event("submit", { cancelable: true }));
      } else {
        showView("form");
        submitButton.disabled = false;
        attendanceMainFillerInput.focus();
      }
      return;
    }

    if (result.code === "GRAPHICS_SERVER_NOT_ASSIGNED" && attendanceMainFillerInput.value) {
      const skipQuestion = window.confirm("No Graphics server is assigned for this date. Skip the optional question and submit attendance?");
      if (skipQuestion) {
        attendanceMainFillerInput.value = "";
        saveAttendanceDraft();
        await submitAttendance(new Event("submit", { cancelable: true }));
      } else {
        showView("form");
        submitButton.disabled = false;
        attendanceMainFillerInput.focus();
      }
      return;
    }

    if (result.code === "ALREADY_RECORDED") {
      showDuplicateResult(result);
      return;
    }
    if (!result.success) {
      showResultError(result.message || "Attendance could not be recorded. Please try again.", true);
      return;
    }

    if (result.attendance && result.attendance.mainFiller) {
      mainFillerAlreadyAnsweredToday = true;
      updateMainFillerAvailability();
    }
    showSuccessResult(result.attendance);
  } catch {
    showResultError(
      "Could not connect to Google Apps Script. Check the Web App URL and deployment access, then try again.",
      true,
    );
  }
}

function showSuccessResult(attendance) {
    removeLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY);
  showView("result");
  resultView.innerHTML = `
    <span class="large-symbol success-symbol" aria-hidden="true">✓</span>
    <p class="eyebrow">Check-in complete</p>
    <h2>Attendance Recorded!</h2>
    <p class="flow-description">Your check-in is complete. Have a great day.</p>
    <div class="receipt">
      ${receiptRow("Name", attendance.name)}
      ${receiptRow("Date", attendance.date)}
      ${receiptRow("Time", attendance.time)}
      ${receiptRow("Distance", `${attendance.distance} meters`)}
      ${receiptRow("Status", attendance.status, true)}
    </div>
    <button class="button button-primary result-done" type="button">Done</button>
  `;
  resultView.querySelector(".result-done").addEventListener("click", resetAttendance);
}

function showDuplicateResult(result) {
    removeLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY);
  const attendance = result.attendance || { name: verifiedName };
  showView("result");
  resultView.innerHTML = `
    <span class="large-symbol duplicate-symbol" aria-hidden="true">✓</span>
    <p class="eyebrow">Already on the list</p>
    <h2>Attendance Already Recorded</h2>
    <p class="flow-description">${escapeHtml(result.message || `${attendance.name} has already recorded attendance today.`)}</p>
    <div class="receipt">
      ${receiptRow("Name", attendance.name || verifiedName)}
      ${attendance.date ? receiptRow("Date", attendance.date) : ""}
      ${attendance.time ? receiptRow("Time", attendance.time) : ""}
    </div>
    <button class="button button-primary result-done" type="button">Back</button>
  `;
  resultView.querySelector(".result-done").addEventListener("click", resetAttendance);
}

function showResultError(message, canRetry) {
  showView("result");
  resultView.innerHTML = `
    <span class="large-symbol error-symbol" aria-hidden="true">!</span>
    <p class="eyebrow">Check-in interrupted</p>
    <h2>Unable to Record Attendance</h2>
    <p class="error-copy">${escapeHtml(message)}</p>
    <div class="result-actions">
      ${canRetry ? '<button class="button button-secondary" id="retry-button" type="button">Try Again</button>' : ""}
      <button class="button button-primary" id="back-button" type="button">Back</button>
    </div>
  `;
  const retryButton = document.getElementById("retry-button");
  if (retryButton) retryButton.addEventListener("click", () => void submitAttendance(new Event("submit", { cancelable: true })));
  document.getElementById("back-button").addEventListener("click", resetAttendance);
}

function receiptRow(label, value, isStatus = false) {
  return `<div class="receipt-row"><span>${escapeHtml(label)}</span><strong${isStatus ? ' class="receipt-status"' : ""}>${escapeHtml(value)}</strong></div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function resetAttendance() {
  nameInput.value = "";
  attendanceMainFillerInput.value = "";
  removeLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY);
  nameError.textContent = "";
  currentLocation = null;
  currentDistance = null;
  verifiedName = "";
  submitButton.disabled = true;
  checkButton.disabled = false;
  checkButtonLabel.textContent = "Check My Location";
  permissionTitle.textContent = "Location Access Required";
  permissionMessage.textContent = "This attendance system uses your current location to verify that you are within the designated attendance area.";
  permissionIcon.className = "large-symbol permission-symbol";
  permissionIcon.textContent = "📍";
  allowLocationButton.hidden = false;
  retryLocationButton.hidden = true;
  locationMetrics.hidden = true;
  setLocationStatus(
    "idle",
    "📍",
    "Location not checked",
    "Your location is required before submitting attendance.",
  );
  document.getElementById("loading-title").textContent = "Checking your location...";
  document.getElementById("loading-message").textContent = "Please wait while we verify your current location.";
  document.getElementById("progress-list").innerHTML = `
    <div class="progress-item complete"><span>✓</span>Name entered</div>
    <div class="progress-item current"><span>•</span>Detecting location</div>
    <div class="progress-item"><span>○</span>Checking attendance area</div>
    <div class="progress-item"><span>○</span>Recording attendance</div>
  `;
  showView("form");
  nameInput.focus();
}

function showPage(pageName) {
  const settingsPage = document.querySelector('[data-view="settings"]');
  if (!settingsPage.hidden && pageName !== "settings") lockLocationSettings();

  document.querySelectorAll("[data-view]").forEach((page) => {
    page.hidden = page.dataset.view !== pageName;
  });
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });
  mainContent.classList.toggle("wide-content", pageName !== "attendance");

  if (pageName === "records") void loadRecords();
  if (pageName === "event-entry") void loadSharedEventAttendance();
  if (pageName === "settings") {
    if (locationSettingsUnlocked) {
      populateLocationSettings();
      loadGoogleMap();
    } else {
      locationAccess.hidden = false;
      locationSettingsContent.hidden = true;
    }
  }
}

function unlockLocationSettings(event) {
  event.preventDefault();
  if (locationPasswordInput.value !== LOCATION_SETTINGS_PASSWORD) {
    locationPasswordError.textContent = "That password is not correct. Try again.";
    locationPasswordInput.select();
    return;
  }

  locationSettingsUnlocked = true;
  locationSettingsContent.closest(".settings-page").classList.remove("settings-password-required");
  locationPasswordError.textContent = "";
  locationPasswordInput.value = "";
  locationAccess.hidden = true;
  locationSettingsContent.hidden = false;
  lockLocationButton.hidden = false;
  populateLocationSettings();
  loadGoogleMap();
  void loadGraphicsSchedule();
}

function lockLocationSettings() {
  locationSettingsUnlocked = false;
  locationSettingsContent.closest(".settings-page").classList.add("settings-password-required");
  locationAccess.hidden = false;
  locationSettingsContent.hidden = true;
  lockLocationButton.hidden = true;
  locationPasswordInput.value = "";
  locationPasswordError.textContent = "";
}

function populateLocationSettings() {
  const draft = readLocalDraft(LOCATION_DRAFT_STORAGE_KEY);
  document.getElementById("location-name").value = typeof draft?.name === "string" ? draft.name : attendanceLocation.name;
  document.getElementById("location-latitude").value = typeof draft?.latitude === "string" ? draft.latitude : attendanceLocation.latitude;
  document.getElementById("location-longitude").value = typeof draft?.longitude === "string" ? draft.longitude : attendanceLocation.longitude;
  document.getElementById("location-radius").value = typeof draft?.radius === "string" ? draft.radius : attendanceLocation.radius;
  updateMapPreview();
  updateGoogleMapsLink();
}

function normalizeGraphicsSchedule(value) {
  const servers = Array.isArray(value?.servers)
    ? value.servers.filter((name) => typeof name === "string").map((name) => name.trim().slice(0, 60)).slice(0, 20)
    : Array(4).fill("");
  const assignments = Array.isArray(value?.assignments)
    ? value.assignments.filter((assignment) => assignment && typeof assignment.serverName === "string" && (typeof assignment.startDate === "string" || typeof assignment.date === "string"))
      .map((assignment) => {
        const startDate = assignment.startDate || assignment.date;
        return { startDate, endDate: assignment.endDate || assignment.startDate || assignment.date, serverName: assignment.serverName.trim().slice(0, 60) };
      })
      .slice(0, 500)
    : [];
  return { servers: servers.length ? servers : Array(4).fill(""), assignments };
}

function getIsoDateDay(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timestamp = new Date(`${date}T00:00:00Z`).getTime();
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
  return Math.floor(timestamp / 86400000);
}

function readGraphicsScheduleForm() {
  return {
    servers: [...graphicsServerList.querySelectorAll(".graphics-server-name")].map((input) => input.value.trim().slice(0, 60)),
    assignments: [...graphicsAssignmentList.querySelectorAll(".graphics-assignment-row")].map((row) => ({
      startDate: row.querySelector(".graphics-assignment-start").value,
      endDate: row.querySelector(".graphics-assignment-end").value,
      serverName: row.querySelector("select").value,
    })),
  };
}

function renderGraphicsSchedule() {
  graphicsSchedule = normalizeGraphicsSchedule(graphicsSchedule);
  graphicsServerList.innerHTML = graphicsSchedule.servers.map((name, index) => `
    <div class="graphics-server-row">
      <input class="graphics-server-name form-control" type="text" maxlength="60" aria-label="Graphics server ${index + 1} name" placeholder="Enter server name" value="${escapeHtml(name)}">
      <button class="graphics-remove-button" type="button" data-remove-graphics-server="${index}" aria-label="Remove server ${index + 1}" title="Remove server">×</button>
    </div>
  `).join("");
  renderGraphicsAssignments();
}

function renderGraphicsAssignments() {
  const namedServers = [...graphicsServerList.querySelectorAll(".graphics-server-name")]
    .map((input) => input.value.trim()).filter(Boolean);
  graphicsAssignmentList.innerHTML = graphicsSchedule.assignments.map((assignment, index) => `
    <div class="graphics-assignment-row">
      <label class="graphics-assignment-field"><span>From</span><input class="graphics-assignment-start form-control" type="date" aria-label="Start date ${index + 1}" value="${escapeHtml(assignment.startDate)}"></label>
      <label class="graphics-assignment-field"><span>Through</span><input class="graphics-assignment-end form-control" type="date" aria-label="End date ${index + 1}" value="${escapeHtml(assignment.endDate)}"></label>
      <label class="graphics-assignment-field"><span>Server</span><select class="form-control" aria-label="Assigned Graphics server ${index + 1}">
        <option value="">${namedServers.length ? "Select a server" : "Add a named server first"}</option>
        ${namedServers.map((name) => `<option value="${escapeHtml(name)}"${name === assignment.serverName ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}
      </select></label>
      <button class="graphics-remove-button" type="button" data-remove-graphics-assignment="${index}" aria-label="Remove date assignment" title="Remove assignment">×</button>
    </div>
  `).join("");
}

function addGraphicsServer() {
  graphicsSchedule = readGraphicsScheduleForm();
  if (graphicsSchedule.servers.length >= 20) {
    setGraphicsScheduleStatus("The roster is limited to 20 servers.", "error");
    return;
  }
  graphicsSchedule.servers.push("");
  renderGraphicsSchedule();
  graphicsServerList.lastElementChild?.querySelector("input").focus();
  saveGraphicsScheduleDraft();
}

function removeGraphicsServer(event) {
  const button = event.target.closest("[data-remove-graphics-server]");
  if (!button) return;
  graphicsSchedule = readGraphicsScheduleForm();
  const index = Number(button.dataset.removeGraphicsServer);
  const removedName = graphicsSchedule.servers[index];
  if (graphicsSchedule.servers.length <= 1) {
    setGraphicsScheduleStatus("Keep at least one server slot in the roster.", "error");
    return;
  }
  graphicsSchedule.servers.splice(index, 1);
  if (removedName) graphicsSchedule.assignments = graphicsSchedule.assignments.filter((assignment) => assignment.serverName !== removedName);
  renderGraphicsSchedule();
  saveGraphicsScheduleDraft();
}

function addGraphicsAssignment() {
  graphicsSchedule = readGraphicsScheduleForm();
  graphicsSchedule.assignments.push({
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    serverName: graphicsSchedule.servers.find(Boolean) || "",
  });
  renderGraphicsSchedule();
  saveGraphicsScheduleDraft();
}

function removeGraphicsAssignment(event) {
  const button = event.target.closest("[data-remove-graphics-assignment]");
  if (!button) return;
  graphicsSchedule = readGraphicsScheduleForm();
  graphicsSchedule.assignments.splice(Number(button.dataset.removeGraphicsAssignment), 1);
  renderGraphicsSchedule();
  saveGraphicsScheduleDraft();
}

function saveGraphicsScheduleDraft() {
  graphicsSchedule = readGraphicsScheduleForm();
  writeLocalDraft(GRAPHICS_SCHEDULE_DRAFT_KEY, graphicsSchedule);
}

function setGraphicsScheduleStatus(message, kind = "") {
  graphicsScheduleStatus.textContent = message;
  graphicsScheduleStatus.className = `graphics-schedule-status${kind ? ` ${kind}` : ""}`;
}

async function loadGraphicsSchedule() {
  const draft = readLocalDraft(GRAPHICS_SCHEDULE_DRAFT_KEY);
  if (GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    graphicsSchedule = normalizeGraphicsSchedule(draft);
    renderGraphicsSchedule();
    setGraphicsScheduleStatus("Local draft loaded. Set the Apps Script URL to share schedules with attendees.", "error");
    return;
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error("Schedule could not be loaded.");
    graphicsSchedule = normalizeGraphicsSchedule(draft || result.graphicsSchedule);
    renderGraphicsSchedule();
    setGraphicsScheduleStatus(draft ? "Unsaved local schedule draft restored. Save it to publish the changes." : "Shared Graphics schedule loaded.");
  } catch (error) {
    graphicsSchedule = normalizeGraphicsSchedule(draft);
    renderGraphicsSchedule();
    setGraphicsScheduleStatus("Could not load the shared schedule. Local draft is shown, if available.", "error");
  }
}

async function saveGraphicsSchedule() {
  graphicsSchedule = readGraphicsScheduleForm();
  const servers = graphicsSchedule.servers.map((name) => name.trim()).filter(Boolean);
  const normalizedNames = servers.map((name) => name.toLocaleLowerCase());
  const assignments = graphicsSchedule.assignments.filter((assignment) => assignment.startDate || assignment.endDate || assignment.serverName);
  const assignedDays = new Set();
  const hasInvalidAssignment = assignments.some((assignment) => {
    const startDay = getIsoDateDay(assignment.startDate);
    const endDay = getIsoDateDay(assignment.endDate);
    if (startDay === null || endDay === null || endDay < startDay || endDay - startDay >= 7 || !servers.includes(assignment.serverName)) return true;
    for (let day = startDay; day <= endDay; day += 1) {
      if (assignedDays.has(day)) return true;
      assignedDays.add(day);
    }
    return false;
  });

  if (servers.length > 20 || servers.some((name) => name.length > 60) || new Set(normalizedNames).size !== normalizedNames.length) {
    setGraphicsScheduleStatus("Use unique server names, up to 60 characters each, with a maximum of 20 servers.", "error");
    return;
  }
  if (assignments.length > 500 || hasInvalidAssignment) {
    setGraphicsScheduleStatus("Use valid ranges of 1–7 days, one roster server, and no overlapping dates.", "error");
    return;
  }

  graphicsSchedule = { servers, assignments };
  writeLocalDraft(GRAPHICS_SCHEDULE_DRAFT_KEY, graphicsSchedule);
  if (GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    setGraphicsScheduleStatus("Schedule draft saved on this browser. Configure the Apps Script URL to share it with attendees.", "error");
    return;
  }

  const saveButton = document.getElementById("save-graphics-schedule");
  saveButton.disabled = true;
  setGraphicsScheduleStatus("Saving shared Graphics schedule...");
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "saveGraphicsSchedule", servers, assignments }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Schedule could not be saved.");
    graphicsSchedule = normalizeGraphicsSchedule(result.graphicsSchedule);
    renderGraphicsSchedule();
    removeLocalDraft(GRAPHICS_SCHEDULE_DRAFT_KEY);
    setGraphicsScheduleStatus("Shared Graphics schedule saved.", "success");
  } catch (error) {
    setGraphicsScheduleStatus(error.message || "Could not save the shared Graphics schedule.", "error");
  } finally {
    saveButton.disabled = false;
  }
}

function saveLocationSettingsDraft() {
  writeLocalDraft(LOCATION_DRAFT_STORAGE_KEY, {
    name: document.getElementById("location-name").value,
    latitude: document.getElementById("location-latitude").value,
    longitude: document.getElementById("location-longitude").value,
    radius: document.getElementById("location-radius").value,
  });
}

function updateGoogleMapsLink() {
  const latitude = Number(document.getElementById("location-latitude").value);
  const longitude = Number(document.getElementById("location-longitude").value);
  const link = document.getElementById("google-maps-link");
  const validCoordinates =
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

  link.href = validCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : "https://www.google.com/maps";
  link.setAttribute("aria-disabled", String(!validCoordinates));
}

function updateMapPreview() {
  const name = document.getElementById("location-name").value.trim() || "Attendance point";
  const radius = Number(document.getElementById("location-radius").value) || attendanceLocation.radius;
  const latitude = Number(document.getElementById("location-latitude").value);
  const longitude = Number(document.getElementById("location-longitude").value);
  document.getElementById("map-location-name").textContent = `${name} · Attendance Point`;
  document.getElementById("map-radius-label").textContent = `${radius} m allowed radius`;
  document.getElementById("map-scale").textContent = `${radius} m`;
  document.getElementById("map-radius").style.setProperty(
    "--radius-size",
    `${Math.min(250, Math.max(130, 130 * Math.sqrt(radius / 100)))}px`,
  );

  if (
    googleMap && googleMapMarker && googleRadiusCircle &&
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
  ) {
    const point = { lat: latitude, lng: longitude };
    googleMapMarker.setPosition(point);
    googleRadiusCircle.setCenter(point);
    googleRadiusCircle.setRadius(radius);
  }
}

function loadGoogleMap() {
  if (googleMap) {
    google.maps.event.trigger(googleMap, "resize");
    return;
  }

  if (GOOGLE_MAPS_API_KEY.includes("PASTE_YOUR_")) {
    mapConnectMessage.hidden = true;
    return;
  }

  if (googleMapLoadStarted) return;
  if (window.google && window.google.maps) {
    initializeGoogleAttendanceMap();
    return;
  }

  googleMapLoadStarted = true;
  mapConnectMessage.textContent = "Loading Google Maps…";
  mapConnectMessage.hidden = false;
  window.initializeGeoAttendMap = initializeGoogleAttendanceMap;

  const script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&callback=initializeGeoAttendMap&loading=async`;
  script.onerror = () => {
    googleMapLoadStarted = false;
    mapConnectMessage.textContent = "Google Maps could not load. Check the API key and Maps JavaScript API settings.";
  };
  document.head.appendChild(script);
}

function initializeGoogleAttendanceMap() {
  const latitude = Number(document.getElementById("location-latitude").value);
  const longitude = Number(document.getElementById("location-longitude").value);
  const radius = Number(document.getElementById("location-radius").value) || attendanceLocation.radius;
  const point = { lat: latitude, lng: longitude };

  googleMap = new google.maps.Map(googleMapCanvas, {
    center: point,
    zoom: 17,
    mapTypeControl: false,
    streetViewControl: false,
    clickableIcons: false,
    fullscreenControl: true,
  });
  googleMapMarker = new google.maps.Marker({
    map: googleMap,
    position: point,
    title: "Attendance Point",
    draggable: true,
  });
  googleRadiusCircle = new google.maps.Circle({
    map: googleMap,
    center: point,
    radius: radius,
    clickable: false,
    fillColor: "#b08a43",
    fillOpacity: 0.16,
    strokeColor: "#9a7433",
    strokeOpacity: 0.8,
    strokeWeight: 2,
  });

  googleMap.addListener("click", (event) => {
    if (event.latLng) setLocationFromMap(event.latLng.lat(), event.latLng.lng());
  });
  googleMapMarker.addListener("dragend", (event) => {
    if (event.latLng) setLocationFromMap(event.latLng.lat(), event.latLng.lng());
  });

  mapFallback.hidden = true;
  mapConnectMessage.hidden = true;
  mapInstruction.hidden = false;
  updateMapPreview();
}

function setLocationFromMap(latitude, longitude) {
  document.getElementById("location-latitude").value = latitude.toFixed(6);
  document.getElementById("location-longitude").value = longitude.toFixed(6);
  updateGoogleMapsLink();
  updateMapPreview();
  saveLocationSettingsDraft();
}

function saveLocationSettings(event) {
  event.preventDefault();
  const nextSettings = {
    name: document.getElementById("location-name").value.trim(),
    latitude: Number(document.getElementById("location-latitude").value),
    longitude: Number(document.getElementById("location-longitude").value),
    radius: Number(document.getElementById("location-radius").value),
  };

  if (
    !nextSettings.name || !Number.isFinite(nextSettings.latitude) ||
    nextSettings.latitude < -90 || nextSettings.latitude > 90 ||
    !Number.isFinite(nextSettings.longitude) || nextSettings.longitude < -180 || nextSettings.longitude > 180 ||
    !Number.isFinite(nextSettings.radius) || nextSettings.radius <= 0
  ) {
    showToast("Enter a valid name, coordinate pair, and radius.");
    return;
  }

  attendanceLocation = nextSettings;
  updateEventLocationReference();
  let persisted = true;
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(attendanceLocation));
    localStorage.removeItem(LOCATION_DRAFT_STORAGE_KEY);
  } catch (error) {
    persisted = false;
  }

  currentLocation = null;
  currentDistance = null;
  verifiedName = "";
  eventSubmissionLocation = null;
  eventLocationCheckedAt = 0;
  saveEventAttendanceButton.disabled = true;
  setEventLocationStatus("idle", "📍", "Location not checked", "The person submitting this roster must be within the attendance area.");
  submitButton.disabled = true;
  locationMetrics.hidden = true;
  setLocationStatus("idle", "📍", "Location not checked", "Check your location again to use the updated radius.");
  updateMapPreview();
  showToast(persisted ? "Location saved on this browser." : "Location updated for this visit only.");
}

async function loadRecords() {
  if (GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    sheetsConnected = false;
    attendanceRecords = [];
    updateSheetsStatus("disconnected", "Google Sheets Disconnected", "Set the Apps Script URL to load attendance records.");
    renderRecords();
    return;
  }

  updateSheetsStatus("loading", "Connecting to Google Sheets...", "Loading attendance records.");
  const refreshButton = document.getElementById("refresh-records");
  refreshButton.disabled = true;
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.records)) {
      throw new Error("Attendance records are unavailable.");
    }
    attendanceRecords = result.records;
    if (Array.isArray(result.eventAttendance)) {
      eventAttendanceRecords = result.eventAttendance;
      try {
        localStorage.setItem(EVENT_ATTENDANCE_STORAGE_KEY, JSON.stringify(eventAttendanceRecords));
      } catch (error) {
        // Shared data should remain the canonical record when local storage is limited.
      }
    }
    renderEventAttendance();
    sheetsConnected = true;
    updateSheetsStatus("connected", "Google Sheets Connected", "Attendance records are being synchronized automatically.");
  } catch (error) {
    sheetsConnected = false;
    attendanceRecords = [];
    updateSheetsStatus("disconnected", "Google Sheets Disconnected", "Attendance records could not be loaded. No example rows are shown.");
  }
  refreshButton.disabled = false;
  renderRecords();
}

function updateSheetsStatus(state, title, message) {
  sheetsStatus.className = `sheets-status ${state}`;
  document.getElementById("sheets-title").textContent = title;
  document.getElementById("sheets-message").textContent = message;
}

function getFilteredRecords() {
  const search = document.getElementById("record-search").value.trim().toLocaleLowerCase();
  const dateValue = document.getElementById("record-date").value;
  const selectedDate = dateValue
    ? `${dateValue.slice(5, 7)}/${dateValue.slice(8, 10)}/${dateValue.slice(0, 4)}`
    : "";
  const selectedStatus = document.getElementById("record-status").value;

  return attendanceRecords.filter((record) =>
    String(record.name).toLocaleLowerCase().includes(search) &&
    (!selectedDate || record.date === selectedDate) &&
    (selectedStatus === "all" || record.status === selectedStatus),
  );
}

function renderRecords() {
  const filtered = getFilteredRecords();
  recordsBody.innerHTML = filtered.length
    ? filtered.map((record, index) => {
      const status = String(record.status || "Present").toLocaleLowerCase();
      const statusClass = ["present", "absent", "late"].includes(status) ? status : "other";
      const graphicsStatus = String(record.graphicsServerStatus || "").toLocaleLowerCase();
      const graphicsStatusClass = ["present", "absent"].includes(graphicsStatus) ? `server-status-${graphicsStatus}` : "";
      const graphicsServer = record.graphicsServerName
        ? `<div class="graphics-server-record"><strong>${escapeHtml(record.graphicsServerName)}</strong><small class="${graphicsStatusClass}">${escapeHtml(record.graphicsServerStatus || "Status unavailable")}</small></div>`
        : "—";
      return `<tr class="record-row-${index % 2}"><td class="record-name">${escapeHtml(record.name)}</td><td>${escapeHtml(record.date)}</td><td>${escapeHtml(compactTime(record.time))}</td><td>${Math.round(Number(record.distance))} m</td><td><span class="record-status status-${statusClass}">${escapeHtml(record.status)}</span></td><td>${graphicsServer}</td></tr>`;
    }).join("")
    : '<tr><td class="empty-records" colspan="6">No attendance records match these filters.</td></tr>';
  document.getElementById("records-count").textContent = `Showing ${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;

  const today = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date());
  const todayRecords = attendanceRecords.filter((record) => record.date === today);
  const latestRecord = attendanceRecords.reduce((latest, record) => {
    if (!latest) return record;
    const dateDifference = parseAttendanceDate(record.date) - parseAttendanceDate(latest.date);
    return dateDifference > 0 || (dateDifference === 0 && timeSortValue(record.time) > timeSortValue(latest.time))
      ? record
      : latest;
  }, null);

  document.getElementById("today-count").textContent = String(todayRecords.length);
  document.getElementById("total-count").textContent = attendanceRecords.length.toLocaleString("en-US");
  document.getElementById("latest-time").textContent = latestRecord ? compactTime(latestRecord.time) : "--";
  document.getElementById("latest-name").textContent = latestRecord?.name || "No check-ins yet";
  document.getElementById("records-updated").textContent = sheetsConnected ? "Live Google Sheets records" : "No live records loaded";
}

function compactTime(time) {
  return String(time).replace(/^(\d{1,2}:\d{2}):\d{2}(\s[AP]M)$/, "$1$2");
}

function exportRecords() {
  const records = getFilteredRecords().slice().sort((first, second) => {
    const firstDate = parseAttendanceDate(first.date);
    const secondDate = parseAttendanceDate(second.date);
    return firstDate - secondDate || timeSortValue(first.time) - timeSortValue(second.time);
  });
  const months = [...new Set(records.map((record) => {
    const date = parseAttendanceDate(record.date);
    return `${date.getFullYear()}-${date.getMonth()}`;
  }))];
  const titleDate = records.length ? parseAttendanceDate(records[0].date) : new Date();
  const monthTitle = months.length <= 1
    ? titleDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `Ministry Attendance ${titleDate.getFullYear()}`;
  const dateCounts = new Map();
  const timeCounts = new Map();
  records.forEach((record) => {
    const dateKey = record.date;
    const timeKey = `${dateKey}|${formatExportTime(record.time)}`;
    dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);
    timeCounts.set(timeKey, (timeCounts.get(timeKey) || 0) + 1);
  });

  let previousDate = "";
  let previousTimeGroup = "";
  const dataRows = records.map((record, index) => {
    const date = parseAttendanceDate(record.date);
    const dateKey = record.date;
    const time = formatExportTime(record.time);
    const timeGroup = `${dateKey}|${time}`;
    const status = String(record.status || "Present").toLocaleLowerCase();
    const displayDate = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const statusClass = status === "absent" ? "absent" : status === "late" ? "late" : "present";
    const cells = [];

    if (dateKey !== previousDate) {
      cells.push(`<td class="date-cell" rowspan="${dateCounts.get(dateKey)}">${escapeHtml(displayDate)}</td>`);
    }
    if (timeGroup !== previousTimeGroup) {
      cells.push(`<td class="time-cell" rowspan="${timeCounts.get(timeGroup)}">${escapeHtml(time)}</td>`);
    }
    cells.push(`<td class="name-cell name-${index % 2}">${escapeHtml(record.name)}</td>`);
    cells.push(`<td class="attendance-cell ${statusClass}">${escapeHtml(status)}</td>`);
    cells.push('<td class="gutter-cell"></td>');
    cells.push(`<td class="date-cell">${escapeHtml(displayDate)}</td>`);
    cells.push(`<td class="name-cell name-${index % 2}">${escapeHtml(record.name)}</td>`);
    cells.push(`<td class="attendance-cell ${statusClass}">${escapeHtml(status)}</td>`);
    cells.push(status === "absent"
      ? '<td class="warning-cell">WARNING</td>'
      : '<td class="warning-cell"></td>');

    previousDate = dateKey;
    previousTimeGroup = timeGroup;
    return `<tr>${cells.join("")}</tr>`;
  });

  const emptyRow = '<tr><td class="empty-cell" colspan="4">No attendance records match these filters.</td><td class="gutter-cell"></td><td class="empty-cell" colspan="4"></td></tr>';
  const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>${escapeHtml(monthTitle)}</title>
<style>
body{font-family:Arial,sans-serif;color:#201d18}table{border-collapse:collapse;table-layout:fixed;width:1294px}col.date{width:175px}col.time{width:90px}col.name{width:240px}col.attendance{width:120px}col.gutter{width:24px}col.warning{width:110px}th,td{border:1px solid #17140f;padding:5px 8px;vertical-align:middle;white-space:normal;overflow-wrap:break-word;font-size:11px}.month-title{background:#fff0c2;font-size:15px;font-style:italic;text-align:center;height:28px}.graphics-title{background:#9400d3;color:#fff;font-size:13px;font-style:italic;text-align:center}.column-heading{background:#ffedb5;font-weight:bold;text-align:center}.gutter-cell{border:0;background:#fff}.date-cell,.time-cell{background:#fff8e5;text-align:center}.name-cell{font-family:Georgia,serif;text-align:center}.name-0{background:#eee5f6}.name-1{background:#fff}.attendance-cell{text-align:center;text-transform:lowercase;font-style:italic;font-weight:bold}.present{background:#c8eccd;color:#155724}.absent{background:#e12620;color:#fff}.late{background:#ffe5a3;color:#684600}.warning-cell{background:#e33b32;color:#fff;text-align:center;font-weight:bold}.empty-cell{height:30px;color:#777;text-align:center}
</style></head><body><table><colgroup><col class="date"><col class="time"><col class="name"><col class="attendance"><col class="gutter"><col class="date"><col class="name"><col class="attendance"><col class="warning"></colgroup>
<tr><th class="month-title" colspan="4">${escapeHtml(monthTitle)}</th><td class="gutter-cell"></td><th class="graphics-title" colspan="4">GRAPHICS ATTENDANCE</th></tr>
<tr><th class="column-heading">Date</th><th class="column-heading">Time</th><th class="column-heading">Name</th><th class="column-heading">Attendance</th><td class="gutter-cell"></td><th class="column-heading">Date</th><th class="column-heading">Name</th><th class="column-heading">Attendance</th><th class="column-heading">WARNING</th></tr>
${dataRows.length ? dataRows.join("\r\n") : emptyRow}
</table></body></html>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ministry-attendance-${titleDate.getFullYear()}-${String(titleDate.getMonth() + 1).padStart(2, "0")}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsvRecords() {
  const rows = [["Name", "Date", "Time", "Distance", "Status", "Graphics Server", "Server Status"], ...getFilteredRecords().map((record) => [record.name, record.date, record.time, `${record.distance}m`, record.status, record.graphicsServerName || "", record.graphicsServerStatus || ""])];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ministry-attendance-records.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseAttendanceDate(value) {
  const [month, day, year] = String(value).split("/").map(Number);
  return new Date(year || 2026, (month || 1) - 1, day || 1, 12);
}

function formatExportTime(value) {
  return compactTime(value).replace(/^0(?=\d:)/, "");
}

function timeSortValue(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return 0;
  const hour = Number(match[1]) % 12 + (match[4].toUpperCase() === "PM" ? 12 : 0);
  return hour * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

function getTodayIsoDate() {
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function getTodayDate() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function addAttendeeRow(shouldFocus = true) {
  const row = document.createElement("div");
  row.className = "attendee-entry";
  row.innerHTML = `
    <label class="attendee-name-field"><span>Name</span><input class="attendee-name form-control" type="text" maxlength="80" placeholder="Enter a full name" required></label>
    <label class="attendee-status-field"><span>Attendance</span><select class="attendee-status form-control"><option value="Present">Present</option><option value="Late">Late</option><option value="Absent">Absent</option></select></label>
    <button class="remove-attendee" type="button" data-remove-attendee aria-label="Remove attendee">×</button>
  `;
  eventAttendees.append(row);
  updateRemoveAttendeeButtons();
  if (shouldFocus) {
    row.querySelector(".attendee-name").focus();
    saveEventAttendanceDraft();
  }
}

function removeAttendeeRow(event) {
  const removeButton = event.target.closest("[data-remove-attendee]");
  if (!removeButton || eventAttendees.children.length <= 1) return;
  removeButton.closest(".attendee-entry").remove();
  updateRemoveAttendeeButtons();
  saveEventAttendanceDraft();
}

function updateRemoveAttendeeButtons() {
  const rows = [...eventAttendees.querySelectorAll(".attendee-entry")];
  rows.forEach((row) => {
    row.querySelector("[data-remove-attendee]").disabled = rows.length === 1;
  });
}

function saveAttendanceDraft() {
  const draft = {
    name: nameInput.value.slice(0, 80),
    mainFiller: attendanceMainFillerInput.value,
  };
  if (draft.name || draft.mainFiller) writeLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY, draft);
  else removeLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY);
}

function restoreAttendanceDraft() {
  const draft = readLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY);
  if (typeof draft?.name === "string") nameInput.value = draft.name.slice(0, 80);
  attendanceMainFillerInput.value = ["Yes", "No"].includes(draft?.mainFiller) ? draft.mainFiller : "";
}

function saveEventAttendanceDraft() {
  const attendees = [...eventAttendees.querySelectorAll(".attendee-entry")].map((row) => ({
    name: row.querySelector(".attendee-name").value.slice(0, 80),
    status: row.querySelector(".attendee-status").value,
  }));
  const eventType = document.getElementById("event-type").value.slice(0, 100);
  const mainFiller = document.getElementById("event-main-filler").value;
  const hasDraft = eventType.trim() || mainFiller === "Yes" || attendees.length > 1 || attendees.some((attendee) => attendee.name.trim());

  if (!hasDraft) {
    removeLocalDraft(EVENT_DRAFT_STORAGE_KEY);
    return;
  }

  writeLocalDraft(EVENT_DRAFT_STORAGE_KEY, { eventType, mainFiller, attendees });
}

function restoreEventAttendanceDraft() {
  const draft = readLocalDraft(EVENT_DRAFT_STORAGE_KEY);
  if (!draft || typeof draft !== "object") return;

  document.getElementById("event-type").value = typeof draft.eventType === "string" ? draft.eventType.slice(0, 100) : "";
  document.getElementById("event-main-filler").value = draft.mainFiller === "Yes" ? "Yes" : "No";
  const attendees = Array.isArray(draft.attendees)
    ? draft.attendees.filter((attendee) => attendee && typeof attendee === "object").slice(0, 100)
    : [];
  if (!attendees.length) return;

  attendees.forEach((attendee, index) => {
    if (index > 0) addAttendeeRow(false);
    const row = eventAttendees.children[index];
    row.querySelector(".attendee-name").value = typeof attendee.name === "string" ? attendee.name.slice(0, 80) : "";
    row.querySelector(".attendee-status").value = ["Present", "Late", "Absent"].includes(attendee.status) ? attendee.status : "Present";
  });
  updateRemoveAttendeeButtons();
}

function setEventLocationStatus(kind, icon, title, message) {
  eventLocationStatus.className = `location-status status-${kind}`;
  eventLocationIcon.textContent = icon;
  eventLocationTitle.textContent = title;
  eventLocationMessage.textContent = message;
}

function checkEventSubmitterLocation() {
  if (!navigator.geolocation) {
    eventSubmissionLocation = null;
    saveEventAttendanceButton.disabled = true;
    setEventLocationStatus("error", "🔴", "Location unavailable", "This browser does not support GPS location.");
    return;
  }

  eventSubmissionLocation = null;
  saveEventAttendanceButton.disabled = true;
  checkEventLocationButton.disabled = true;
  checkEventLocationButton.textContent = "Checking Location…";
  setEventLocationStatus("checking", "📍", "Checking event location…", "Verifying the submitter is inside the attendance area.");

  navigator.geolocation.getCurrentPosition((position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = Math.max(1, Math.round(position.coords.accuracy));
    const distance = calculateDistance(latitude, longitude, attendanceLocation.latitude, attendanceLocation.longitude);
    checkEventLocationButton.disabled = false;

    if (distance > attendanceLocation.radius) {
      checkEventLocationButton.textContent = "Refresh Event Location";
      setEventLocationStatus(
        "outside",
        "🔴",
        "Outside Attendance Area",
        `You are ${Math.round(distance)} meters away. The submitter must be within ${attendanceLocation.radius} meters.`,
      );
      return;
    }

    eventSubmissionLocation = { latitude, longitude, accuracy, distance };
    eventLocationCheckedAt = Date.now();
    saveEventAttendanceButton.disabled = false;
    checkEventLocationButton.textContent = "Refresh Event Location";
    setEventLocationStatus(
      "verified",
      "🟢",
      "Location Verified",
      `Submitter is ${Math.round(distance)} meters from the attendance point (±${accuracy} m accuracy).`,
    );
  }, (error) => {
    checkEventLocationButton.disabled = false;
    checkEventLocationButton.textContent = "Try Again";
    eventSubmissionLocation = null;
    saveEventAttendanceButton.disabled = true;

    if (error.code === error.PERMISSION_DENIED) {
      setEventLocationStatus("warning", "🟡", "Location Permission Required", "Allow location access to submit event attendance.");
    } else if (error.code === error.TIMEOUT) {
      setEventLocationStatus("error", "🔴", "GPS Timed Out", "Check your signal and try the location check again.");
    } else {
      setEventLocationStatus("error", "🔴", "Unable to determine location", "Make sure location services are enabled and try again.");
    }
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

async function saveEventAttendance(event) {
  event.preventDefault();
  eventError.textContent = "";

  if (
    !eventSubmissionLocation ||
    Date.now() - eventLocationCheckedAt > 5 * 60 * 1000 ||
    eventSubmissionLocation.distance > attendanceLocation.radius
  ) {
    saveEventAttendanceButton.disabled = true;
    setEventLocationStatus("warning", "🟡", "Check Event Location First", "Verify the submitter is inside the attendance area before saving this roster.");
    return;
  }

  const eventType = document.getElementById("event-type").value.trim();
  const attendees = [...eventAttendees.querySelectorAll(".attendee-entry")].map((row) => ({
    name: row.querySelector(".attendee-name").value.trim(),
    status: row.querySelector(".attendee-status").value,
  }));

  if (!eventType) {
    eventError.textContent = "Enter the type of event.";
    document.getElementById("event-type").focus();
    return;
  }
  if (attendees.some((attendee) => !attendee.name)) {
    eventError.textContent = "Enter a name for each attendee or remove the empty row.";
    eventAttendees.querySelector(".attendee-name:placeholder-shown")?.focus();
    return;
  }

  if (!sharedGraphicsSchedule.assignments.length) await loadDailyMainFillerStatus();
  const mainFiller = document.getElementById("event-main-filler").value;
  const graphicsServerAssignment = getGraphicsAssignmentForDate(getTodayIsoDate());

  const record = {
    eventType,
    date: new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date()),
    mainFiller,
    submitterDistance: Math.round(eventSubmissionLocation.distance),
    graphicsServerName: graphicsServerAssignment?.serverName || "",
    graphicsServerStatus: graphicsServerAssignment
      ? mainFiller === "Yes" ? "Present" : "Absent"
      : "",
    attendees,
  };

  if (GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    eventAttendanceRecords.unshift(record);

    let savedOnBrowser = false;
    try {
      localStorage.setItem(EVENT_ATTENDANCE_STORAGE_KEY, JSON.stringify(eventAttendanceRecords));
      localStorage.removeItem(EVENT_DRAFT_STORAGE_KEY);
      savedOnBrowser = true;
    } catch (error) {
      savedOnBrowser = false;
    }

    renderEventAttendance();
    eventSubmissionLocation = null;
    eventLocationCheckedAt = 0;
    saveEventAttendanceButton.disabled = true;
    checkEventLocationButton.disabled = false;
    checkEventLocationButton.textContent = "Check Event Location";
    setEventLocationStatus("idle", "📍", "Location not checked", "The person submitting this roster must be within the attendance area.");
    document.getElementById("event-type").value = "";
    document.getElementById("event-main-filler").value = "No";
    eventAttendees.innerHTML = `
      <div class="attendee-entry">
        <label class="attendee-name-field"><span>Name</span><input class="attendee-name form-control" type="text" maxlength="80" placeholder="Enter a full name" required></label>
        <label class="attendee-status-field"><span>Attendance</span><select class="attendee-status form-control"><option value="Present">Present</option><option value="Late">Late</option><option value="Absent">Absent</option></select></label>
        <button class="remove-attendee" type="button" data-remove-attendee aria-label="Remove attendee" disabled>×</button>
      </div>`;
    showToast(savedOnBrowser ? "Event attendance saved on this browser." : "Event attendance is only available for this visit.");
    return;
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveEventAttendance",
        eventType,
        date: record.date,
        mainFiller,
        submitterDistance: record.submitterDistance,
        graphicsServerName: record.graphicsServerName,
        graphicsServerStatus: record.graphicsServerStatus,
        attendees,
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "The event roster could not be saved.");
    }

    if (Array.isArray(result.eventAttendance)) {
      eventAttendanceRecords = result.eventAttendance;
      try {
        localStorage.setItem(EVENT_ATTENDANCE_STORAGE_KEY, JSON.stringify(eventAttendanceRecords));
        localStorage.removeItem(EVENT_DRAFT_STORAGE_KEY);
      } catch (error) {
        // The shared database remains the source of truth even if local storage is blocked.
      }
    }

    renderEventAttendance();
    eventSubmissionLocation = null;
    eventLocationCheckedAt = 0;
    saveEventAttendanceButton.disabled = true;
    checkEventLocationButton.disabled = false;
    checkEventLocationButton.textContent = "Check Event Location";
    setEventLocationStatus("idle", "📍", "Location not checked", "The person submitting this roster must be within the attendance area.");
    document.getElementById("event-type").value = "";
    document.getElementById("event-main-filler").value = "No";
    eventAttendees.innerHTML = `
      <div class="attendee-entry">
        <label class="attendee-name-field"><span>Name</span><input class="attendee-name form-control" type="text" maxlength="80" placeholder="Enter a full name" required></label>
        <label class="attendee-status-field"><span>Attendance</span><select class="attendee-status form-control"><option value="Present">Present</option><option value="Late">Late</option><option value="Absent">Absent</option></select></label>
        <button class="remove-attendee" type="button" data-remove-attendee aria-label="Remove attendee" disabled>×</button>
      </div>`;
    showToast("Event attendance saved and shared with all site visitors.");
  } catch (error) {
    eventError.textContent = error.message || "The event roster could not be saved.";
  }
}

function renderEventAttendance() {
  const rows = eventAttendanceRecords.flatMap((eventRecord) =>
    eventRecord.attendees.map((attendee) => {
      const status = String(attendee.status || "Present").toLocaleLowerCase();
      const statusClass = ["present", "late", "absent"].includes(status) ? status : "other";
      const graphicsServer = getEventGraphicsServerData(eventRecord);
      const graphicsStatus = String(graphicsServer.serverStatus || "").toLocaleLowerCase();
      const graphicsStatusClass = ["present", "absent"].includes(graphicsStatus) ? `server-status-${graphicsStatus}` : "";
      const graphicsCell = graphicsServer.serverName
        ? `<div class="graphics-server-record"><strong>${escapeHtml(graphicsServer.serverName)}</strong><small class="${graphicsStatusClass}">${escapeHtml(graphicsServer.serverStatus)}</small></div>`
        : "—";
      const row = `<tr><td>${escapeHtml(eventRecord.eventType)}</td><td>${escapeHtml(eventRecord.date)}</td><td>${graphicsCell}</td><td class="record-name">${escapeHtml(attendee.name)}</td><td><span class="record-status status-${statusClass}">${escapeHtml(status)}</span></td></tr>`;
      return row;
    }),
  );

  const emptyRoster = '<tr><td class="empty-records" colspan="5">No event attendance has been saved on this browser.</td></tr>';
  eventRecordsBody.innerHTML = rows.length
    ? rows.join("")
    : emptyRoster;
  recordsEventBody.innerHTML = rows.length
    ? rows.join("")
    : '<tr><td class="empty-records" colspan="5">No event entries have been saved on this browser.</td></tr>';
  const entryCount = `${rows.length} ${rows.length === 1 ? "entry" : "entries"}`;
  document.getElementById("records-event-count").textContent = entryCount;
  document.getElementById("records-event-note").textContent = `Saved on this browser · ${entryCount}`;
}

function exportEventAttendance() {
  const monthTitle = `Event Attendance · ${getTodayDate()}`;
  const rows = eventAttendanceRecords.flatMap((eventRecord) =>
    eventRecord.attendees.map((attendee, index) => {
      const status = String(attendee.status || "Present").toLocaleLowerCase();
      const statusClass = status === "absent" ? "absent" : status === "late" ? "late" : "present";
      const graphicsServer = getEventGraphicsServerData(eventRecord);
      const serverStatus = graphicsServer.serverName ? `${graphicsServer.serverName} / ${graphicsServer.serverStatus}` : "—";
      return `<tr><td class="event-cell">${escapeHtml(eventRecord.eventType)}</td><td class="date-cell">${escapeHtml(eventRecord.date)}</td><td class="filler-cell">${escapeHtml(serverStatus)}</td><td class="name-cell name-${index % 2}">${escapeHtml(attendee.name)}</td><td class="attendance-cell ${statusClass}">${escapeHtml(status)}</td></tr>`;
    }),
  );
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;color:#201d18}table{border-collapse:collapse;table-layout:fixed;width:900px}col.event{width:290px}col.date{width:175px}col.name{width:240px}col.status{width:120px}col.filler{width:120px}th,td{border:1px solid #17140f;padding:7px 10px;vertical-align:middle;white-space:normal;overflow-wrap:break-word;font-size:11px}.title{background:#fff0c2;font-size:15px;font-style:italic;text-align:center}.heading{background:#ffedb5;font-weight:bold;text-align:center}.event-cell{background:#fff8e5}.date-cell{text-align:center;background:#fff8e5}.name-cell{font-family:Georgia,serif;text-align:center}.name-0{background:#eee5f6}.name-1{background:#fff}.attendance-cell{text-align:center;font-style:italic;font-weight:bold;text-transform:lowercase}.present{background:#c8eccd;color:#155724}.late{background:#ffe5a3;color:#684600}.absent{background:#e12620;color:#fff}.filler-cell{text-align:center}
  </style></head><body><table><colgroup><col class="event"><col class="date"><col class="filler"><col class="name"><col class="status"></colgroup><tr><th class="title" colspan="5">${escapeHtml(monthTitle)}</th></tr><tr><th class="heading">Type of Event</th><th class="heading">Date</th><th class="heading">Graphics Server / Status</th><th class="heading">Name</th><th class="heading">Attendance</th></tr>${rows.length ? rows.join("") : '<tr><td colspan="5">No event attendance has been saved.</td></tr>'}</table></body></html>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ministry-event-attendance-${new Date().getFullYear()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}