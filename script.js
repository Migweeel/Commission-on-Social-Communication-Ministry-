// Change these three values to match your official attendance location.
const ATTENDANCE_LATITUDE = 14.5792427;
const ATTENDANCE_LONGITUDE = 120.994319;
const ATTENDANCE_RADIUS = 100;
const DEFAULT_ATTENDANCE_LATITUDE = 14.579360932514904;
const DEFAULT_ATTENDANCE_LONGITUDE = 120.99486410562278;
// This is a client-side screen lock, not secure authentication.
const LOCATION_SETTINGS_PASSWORD = "multimedia2026";

// Add a browser key restricted to this site's HTTP referrers after enabling Maps JavaScript API.
const GOOGLE_MAPS_API_KEY = "PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE";

// Copy these public web app values from Firebase project settings.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB213xGR9yXCP6bKyt__OJVY-Z6wPWMnOo",
  authDomain: "soccomattendance.firebaseapp.com",
  databaseURL: "https://soccomattendance-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "soccomattendance",
  appId: "1:575423405755:web:ecb9a16c08ee8ecaa5539e",
};
const LOCATION_STORAGE_KEY = "geoattend-location";
const ATTENDANCE_DRAFT_STORAGE_KEY = "geoattend-attendance-draft";
const LOCATION_DRAFT_STORAGE_KEY = "geoattend-location-draft";
const EVENT_DRAFT_STORAGE_KEY = "ministry-event-attendance-draft";
const GRAPHICS_SCHEDULE_DRAFT_KEY = "geoattend-graphics-schedule-draft";
const THEME_STORAGE_KEY = "geoattend-theme";

async function loadSharedEventAttendance() {
  try {
    await databaseReady;
    const snapshot = await database.ref("eventAttendance").once("value");
    eventAttendanceRecords = Object.values(snapshot.val() || {}).reverse();
  } catch (error) {
    eventAttendanceRecords = [];
  }
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
const absentAttendeesInput = document.getElementById("absent-attendees");
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
const eventMainFillerInput = document.getElementById("event-main-filler");
const eventMainFillerNote = document.getElementById("event-main-filler-note");
const eventLocationStatus = document.getElementById("event-location-status");
const eventLocationIcon = document.getElementById("event-location-icon");
const eventLocationTitle = document.getElementById("event-location-title");
const eventLocationMessage = document.getElementById("event-location-message");
const checkEventLocationButton = document.getElementById("check-event-location");
const saveEventAttendanceButton = document.getElementById("save-event-attendance");
const graphicsServerList = document.getElementById("graphics-server-list");
const graphicsAssignmentList = document.getElementById("graphics-assignment-list");
const graphicsScheduleStatus = document.getElementById("graphics-schedule-status");
const themeToggle = document.getElementById("theme-toggle");
const themeToggleIcon = document.getElementById("theme-toggle-icon");
const themeToggleLabel = document.getElementById("theme-toggle-label");

let attendanceLocation = loadLocationSettings();
let attendanceRecords = [];
let eventAttendanceRecords = [];
let database = null;
let databaseReady;
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
let mainFillerAvailabilityVerified = false;
let mainFillerAvailabilityError = false;
let graphicsSchedule = { servers: Array(4).fill(""), assignments: [] };
let sharedGraphicsSchedule = { servers: [], assignments: [] };

function setTheme(theme, persist = false) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  themeToggleIcon.textContent = isDark ? "☀" : "☾";
  themeToggleLabel.textContent = isDark ? "Light mode" : "Dark mode";
  document.querySelector('meta[name="theme-color"]').content = isDark ? "#171a20" : "#f4f2ec";

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    } catch (error) {
      showToast("Theme preference could not be saved. It will last for this visit.");
    }
  }
}

try {
  setTheme(localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light");
} catch (error) {
  setTheme("light");
  showToast("Theme preference could not be loaded. Using light mode for this visit.");
}

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme, true);
});

document.getElementById("radius-value").textContent = `${attendanceLocation.radius} m`;
updateMainFillerAvailability();
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
document.getElementById("restore-default-location").addEventListener("click", restoreDefaultLocationCoordinates);
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
document.getElementById("clear-records").addEventListener("click", openRecordDeletePasswordDialog);
document.getElementById("record-delete-password-form").addEventListener("submit", verifyRecordDeletePassword);
document.getElementById("record-delete-password").addEventListener("input", (event) => {
  event.currentTarget.setCustomValidity("");
});
document.getElementById("cancel-record-delete-password").addEventListener("click", () => {
  document.getElementById("record-delete-password-dialog").close();
});
document.getElementById("record-delete-confirm-form").addEventListener("submit", confirmRecordDeletion);
document.getElementById("record-delete-confirmation").addEventListener("input", (event) => {
  event.currentTarget.setCustomValidity("");
});
document.getElementById("cancel-record-delete-confirmation").addEventListener("click", () => {
  document.getElementById("record-delete-confirm-dialog").close();
});
document.getElementById("export-records").addEventListener("click", exportRecords);
document.getElementById("export-csv").addEventListener("click", exportCsvRecords);
document.getElementById("print-records").addEventListener("click", printAttendanceRecords);
document.getElementById("word-records").addEventListener("click", exportWordAttendanceRecords);
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
databaseReady = connectRealtimeDatabase();
void loadDailyMainFillerStatus();

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
absentAttendeesInput.addEventListener("input", saveAttendanceDraft);

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
  try {
    await databaseReady;
    const today = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date());
    if (!database) throw new Error("The shared database is not available.");
    const responseSnapshot = await database.ref(`mainFillerAnswers/${getTodayIsoDate()}`).once("value");
    mainFillerAlreadyAnsweredToday = responseSnapshot.exists() || attendanceRecords.some((record) =>
      record.date === today && ["Yes", "No"].includes(record.mainFiller),
    ) || eventAttendanceRecords.some((record) =>
      record.date === today && ["Yes", "No"].includes(record.mainFiller),
    );
    mainFillerAvailabilityVerified = true;
    mainFillerAvailabilityError = false;
    updateMainFillerAvailability();
    if (mainFillerAlreadyAnsweredToday) clearMainFillerSelections();
  } catch (error) {
    mainFillerAlreadyAnsweredToday = true;
    mainFillerAvailabilityVerified = true;
    mainFillerAvailabilityError = true;
    updateMainFillerAvailability();
  }
}

async function connectRealtimeDatabase() {
  const requiredConfig = [FIREBASE_CONFIG.apiKey, FIREBASE_CONFIG.projectId, FIREBASE_CONFIG.appId];
  if (requiredConfig.some((value) => value.includes("PASTE_YOUR_")) || FIREBASE_CONFIG.databaseURL.includes("PASTE_YOUR_")) {
    updateSheetsStatus("disconnected", "Realtime Database Not Configured", "Add your Firebase web app config in script.js to enable shared records.");
    return;
  }

  try {
    if (!window.firebase || !firebase.database || !firebase.auth) {
      throw new Error("Firebase SDK could not load.");
    }
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    await firebase.auth().signInAnonymously();
    database = firebase.database();

    database.ref("attendance").on("value", (snapshot) => {
      attendanceRecords = Object.values(snapshot.val() || {}).reverse();
      sheetsConnected = true;
      renderRecords();
      void loadDailyMainFillerStatus();
      updateSheetsStatus("connected", "Realtime Database Connected", "Attendance updates sync live for site visitors.");
    }, handleDatabaseError);

    database.ref("eventAttendance").on("value", (snapshot) => {
      eventAttendanceRecords = Object.values(snapshot.val() || {}).reverse();
      renderEventAttendance();
      void loadDailyMainFillerStatus();
    }, handleDatabaseError);

    database.ref("mainFillerAnswers").on("value", (snapshot) => {
      const today = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }).format(new Date());
      mainFillerAlreadyAnsweredToday = snapshot.child(getTodayIsoDate()).exists() ||
        attendanceRecords.some((record) => record.date === today && ["Yes", "No"].includes(record.mainFiller)) ||
        eventAttendanceRecords.some((record) => record.date === today && ["Yes", "No"].includes(record.mainFiller));
      mainFillerAvailabilityVerified = true;
      mainFillerAvailabilityError = false;
      updateMainFillerAvailability();
      if (mainFillerAlreadyAnsweredToday) clearMainFillerSelections();
    }, handleDatabaseError);

    database.ref("graphicsSchedule").on("value", (snapshot) => {
      sharedGraphicsSchedule = normalizeGraphicsSchedule(snapshot.val());
      if (locationSettingsUnlocked && !readLocalDraft(GRAPHICS_SCHEDULE_DRAFT_KEY)) {
        graphicsSchedule = sharedGraphicsSchedule;
        renderGraphicsSchedule();
      }
    }, handleDatabaseError);

    database.ref("location").on("value", (snapshot) => {
      const saved = snapshot.val();
      if (!saved || typeof saved.name !== "string" || !Number.isFinite(Number(saved.latitude)) || !Number.isFinite(Number(saved.longitude)) || !Number.isFinite(Number(saved.radius))) return;
      attendanceLocation = {
        name: saved.name,
        latitude: Number(saved.latitude),
        longitude: Number(saved.longitude),
        radius: Number(saved.radius),
      };
      updateEventLocationReference();
      if (document.querySelector('[data-view="settings"]').hidden || !readLocalDraft(LOCATION_DRAFT_STORAGE_KEY)) populateLocationSettings();
      document.getElementById("radius-value").textContent = `${attendanceLocation.radius} m`;
    }, handleDatabaseError);
  } catch (error) {
    sheetsConnected = false;
    updateSheetsStatus("disconnected", "Realtime Database Disconnected", error.message || "Check your Firebase setup and anonymous sign-in settings.");
    throw error;
  }
}

function handleDatabaseError(error) {
  sheetsConnected = false;
  updateSheetsStatus("disconnected", "Realtime Database Disconnected", error.message || "Could not synchronize shared records.");
}

function updateMainFillerAvailability() {
  const inputs = [attendanceMainFillerInput, eventMainFillerInput];
  inputs.forEach((input) => {
    input.disabled = !mainFillerAvailabilityVerified || mainFillerAlreadyAnsweredToday;
  });

  if (mainFillerAlreadyAnsweredToday) {
    const message = mainFillerAvailabilityError
      ? "The daily response limit could not be verified. This question is unavailable; attendance and event entries can still be submitted."
      : "This was already answered today. Skip it to submit attendance or save an event entry.";
    attendanceMainFillerNote.textContent = message;
    attendanceMainFillerNote.classList.add("warning");
    eventMainFillerNote.textContent = message;
    eventMainFillerNote.classList.add("warning");
  } else if (!mainFillerAvailabilityVerified) {
    const message = "Checking whether this question has already been answered today...";
    attendanceMainFillerNote.textContent = message;
    eventMainFillerNote.textContent = message;
  } else {
    const message = "Only one person can answer this optional question each day across attendance and event entries.";
    attendanceMainFillerNote.textContent = message;
    attendanceMainFillerNote.classList.remove("warning");
    eventMainFillerNote.textContent = message;
    eventMainFillerNote.classList.remove("warning");
  }
}

function handleMainFillerChange() {
  if ((!mainFillerAvailabilityVerified || mainFillerAlreadyAnsweredToday) && attendanceMainFillerInput.value) {
    window.alert("The daily response limit prevents another answer. Skip the question and submit attendance.");
    attendanceMainFillerInput.value = "";
  }
  saveAttendanceDraft();
}

function clearMainFillerSelections() {
  if (attendanceMainFillerInput.value) {
    attendanceMainFillerInput.value = "";
    saveAttendanceDraft();
  }
  if (eventMainFillerInput.value) {
    eventMainFillerInput.value = "";
    saveEventAttendanceDraft();
  }
}

async function claimDailyMainFillerAnswer(date, name, answer, serverName, recordType, recordId) {
  const responseRef = database.ref(`mainFillerAnswers/${date}`);
  const existingResponse = await responseRef.once("value");
  if (existingResponse.exists()) return false;

  const [, year, month, day] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
  if (!month || !day || !year) throw new Error("The Main Filler response date is invalid.");
  const attendanceDate = `${month}/${day}/${year}`;
  const [attendanceSnapshot, eventSnapshot] = await Promise.all([
    database.ref("attendance").orderByChild("date").equalTo(attendanceDate).once("value"),
    database.ref("eventAttendance").orderByChild("date").equalTo(attendanceDate).once("value"),
  ]);
  const hasLegacyAnswer = [attendanceSnapshot, eventSnapshot].some((snapshot) =>
    Object.values(snapshot.val() || {}).some((record) => ["Yes", "No"].includes(record.mainFiller)),
  );
  if (hasLegacyAnswer) return false;

  const result = await responseRef.transaction((current) => {
    if (current !== null) return;
    return { name, answer, serverName, recordType, recordId };
  });
  return result.committed;
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
    await databaseReady;
    if (!database) throw new Error("Add your Firebase project configuration to script.js first.");

    const [attendanceSnapshot, scheduleSnapshot, mainFillerSnapshot] = await Promise.all([
      database.ref("attendance").once("value"),
      database.ref("graphicsSchedule").once("value"),
      database.ref(`mainFillerAnswers/${getTodayIsoDate()}`).once("value"),
    ]);
    attendanceRecords = Object.values(attendanceSnapshot.val() || {}).reverse();
    sharedGraphicsSchedule = normalizeGraphicsSchedule(scheduleSnapshot.val());

    const today = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date());
    const existing = attendanceRecords.find((record) =>
      record.date === today && String(record.name).trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (existing) {
      showDuplicateResult({ attendance: existing, message: `${existing.name} has already recorded attendance today.` });
      return;
    }

    mainFillerAlreadyAnsweredToday = mainFillerSnapshot.exists() || attendanceRecords.some((record) =>
      record.date === today && ["Yes", "No"].includes(record.mainFiller),
    ) || eventAttendanceRecords.some((record) =>
      record.date === today && ["Yes", "No"].includes(record.mainFiller),
    );
    mainFillerAvailabilityVerified = true;
    mainFillerAvailabilityError = false;
    updateMainFillerAvailability();
    if (mainFillerAlreadyAnsweredToday && attendanceMainFillerInput.value) {
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

    const assignmentDate = getTodayIsoDate();
    const [, assignmentYear, assignmentMonth, assignmentDay] = assignmentDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const graphicsServerAssignment = getGraphicsAssignmentForDate(assignmentDate);
    if (!graphicsServerAssignment && attendanceMainFillerInput.value) {
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

    const now = new Date();
    const attendance = {
      name,
      absentAttendees: [...new Set(absentAttendeesInput.value.split(/\r?\n/).map((attendeeName) => attendeeName.trim()).filter(Boolean))].join("\n"),
      date: `${assignmentMonth}/${assignmentDay}/${assignmentYear}`,
      time: new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now),
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      distance: Math.round(currentDistance),
      status: "Present",
      mainFiller: attendanceMainFillerInput.value,
      graphicsServerName: graphicsServerAssignment?.serverName || "",
      graphicsServerStatus: graphicsServerAssignment
        ? attendanceMainFillerInput.value === "Yes" ? "Present" : attendanceMainFillerInput.value === "No" ? "Absent" : ""
        : "",
    };
    const attendanceRef = database.ref("attendance").push();
    attendance.mainFillerDate = assignmentDate;
    if (attendance.mainFiller) {
      const claimed = await claimDailyMainFillerAnswer(
        assignmentDate,
        attendance.name,
        attendance.mainFiller,
        graphicsServerAssignment.serverName,
        "attendance",
        attendanceRef.key,
      );
      mainFillerAlreadyAnsweredToday = true;
      mainFillerAvailabilityVerified = true;
      mainFillerAvailabilityError = false;
      if (!claimed) {
        attendance.mainFiller = "";
        attendance.graphicsServerStatus = "";
        clearMainFillerSelections();
        showToast("Someone else answered the Main Filler question first. Your attendance will be saved without another answer.");
      }
      updateMainFillerAvailability();
    }
    await attendanceRef.set(attendance);

    if (attendance.mainFiller) {
      mainFillerAlreadyAnsweredToday = true;
      updateMainFillerAvailability();
    }
    showSuccessResult(attendance);
  } catch (error) {
    showResultError(
      error.message || "Could not connect to the shared database. Check Firebase setup and try again.",
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
  absentAttendeesInput.value = "";
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
  try {
    await databaseReady;
    if (!database) throw new Error("Configure Firebase to share the schedule.");
    const snapshot = await database.ref("graphicsSchedule").once("value");
    sharedGraphicsSchedule = normalizeGraphicsSchedule(snapshot.val());
    graphicsSchedule = normalizeGraphicsSchedule(draft || sharedGraphicsSchedule);
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

  const saveButton = document.getElementById("save-graphics-schedule");
  saveButton.disabled = true;
  setGraphicsScheduleStatus("Saving shared Graphics schedule...");
  try {
    await databaseReady;
    if (!database) throw new Error("Configure Firebase to share the schedule.");
    await database.ref("graphicsSchedule").set({ servers, assignments });
    sharedGraphicsSchedule = normalizeGraphicsSchedule({ servers, assignments });
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

function restoreDefaultLocationCoordinates() {
  document.getElementById("location-latitude").value = String(DEFAULT_ATTENDANCE_LATITUDE);
  document.getElementById("location-longitude").value = String(DEFAULT_ATTENDANCE_LONGITUDE);
  updateGoogleMapsLink();
  updateMapPreview();
  saveLocationSettingsDraft();
  showToast("Default coordinates restored as an unsaved draft. Save Location to apply them.");
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

async function saveLocationSettings(event) {
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

  try {
    await databaseReady;
    if (!database) throw new Error("Configure Firebase before saving shared location settings.");
    await database.ref("location").set(nextSettings);
  } catch (error) {
    showToast(error.message || "Location could not be saved to the shared database.");
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
  showToast(persisted ? "Location saved for all site visitors." : "Location shared; browser cache could not be updated.");
}

async function loadRecords() {
  updateSheetsStatus("loading", "Connecting to Realtime Database...", "Loading shared attendance records.");
  try {
    await databaseReady;
    if (!database) throw new Error("Configure Firebase to load shared attendance records.");
    const [attendanceSnapshot, eventSnapshot, scheduleSnapshot] = await Promise.all([
      database.ref("attendance").once("value"),
      database.ref("eventAttendance").once("value"),
      database.ref("graphicsSchedule").once("value"),
    ]);
    attendanceRecords = Object.values(attendanceSnapshot.val() || {}).reverse();
    eventAttendanceRecords = Object.values(eventSnapshot.val() || {}).reverse();
    sharedGraphicsSchedule = normalizeGraphicsSchedule(scheduleSnapshot.val());
    renderEventAttendance();
    sheetsConnected = true;
    updateSheetsStatus("connected", "Realtime Database Connected", "Attendance records sync live for site visitors.");
  } catch (error) {
    sheetsConnected = false;
    updateSheetsStatus("disconnected", "Realtime Database Disconnected", error.message || "Shared attendance records could not be loaded.");
  }
  renderRecords();
}

function openRecordDeletePasswordDialog() {
  document.getElementById("record-delete-password").value = "";
  const errorMessage = document.getElementById("record-delete-error");
  errorMessage.hidden = true;
  errorMessage.textContent = "";
  document.getElementById("record-delete-password-dialog").showModal();
  document.getElementById("record-delete-password").focus();
}

function verifyRecordDeletePassword(event) {
  event.preventDefault();
  const passwordInput = document.getElementById("record-delete-password");
  if (passwordInput.value !== LOCATION_SETTINGS_PASSWORD) {
    passwordInput.value = "";
    passwordInput.setCustomValidity("The password is not correct.");
    passwordInput.reportValidity();
    passwordInput.focus();
    return;
  }

  document.getElementById("record-delete-password-dialog").close();
  document.getElementById("record-delete-confirmation").value = "";
  document.getElementById("record-delete-confirm-dialog").showModal();
  document.getElementById("record-delete-confirmation").focus();
}

async function confirmRecordDeletion(event) {
  event.preventDefault();
  const confirmationInput = document.getElementById("record-delete-confirmation");
  if (confirmationInput.value.trim().toLocaleLowerCase() !== "delete the records") {
    confirmationInput.setCustomValidity('Type "delete the records" to permanently delete the database records.');
    confirmationInput.reportValidity();
    confirmationInput.focus();
    return;
  }

  const confirmButton = document.getElementById("confirm-record-delete");
  const errorMessage = document.getElementById("record-delete-error");
  errorMessage.hidden = true;
  errorMessage.textContent = "";
  confirmButton.disabled = true;
  try {
    await databaseReady;
    if (!database) throw new Error("The Firebase database is not available.");
    updateSheetsStatus("loading", "Deleting database records...", "Removing attendance, event entries, and Main Filler answers.");
    await database.ref().update({
      attendance: null,
      eventAttendance: null,
      mainFillerAnswers: null,
    });

    attendanceRecords = [];
    eventAttendanceRecords = [];
    mainFillerAlreadyAnsweredToday = false;
    mainFillerAvailabilityVerified = true;
    mainFillerAvailabilityError = false;
    clearMainFillerSelections();
    updateMainFillerAvailability();
    renderRecords();
    renderEventAttendance();
    updateSheetsStatus("connected", "Database Records Cleared", "No attendance records or event entries remain.");
    document.getElementById("record-delete-confirm-dialog").close();
    showToast("All attendance, event, and Main Filler records were deleted from Firebase.");
  } catch (error) {
    const detail = error.message || "Firebase did not confirm the deletion.";
    const permissionDenied = /permission_denied|permission denied|insufficient permissions/i.test(detail);
    const message = permissionDenied
      ? "Firebase denied the deletion. Publish the latest database.rules.json in Realtime Database → Rules, then try again."
      : `Firebase could not delete the records: ${detail}`;
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    updateSheetsStatus("disconnected", "Could Not Clear Database Records", message);
  } finally {
    confirmButton.disabled = false;
  }
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

  const matchesFilters = (record) =>
    (!selectedDate || record.date === selectedDate) &&
    (selectedStatus === "all" || String(record.status || "Present").toLocaleLowerCase() === selectedStatus.toLocaleLowerCase());
  return attendanceRecords.flatMap((record) => {
    const rows = [];
    if (String(record.name).toLocaleLowerCase().includes(search) && matchesFilters(record)) rows.push(record);
    const absentNames = String(record.absentAttendees || "").split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
    absentNames.forEach((name) => {
      const absentRecord = {
        ...record,
        name,
        time: "--",
        distance: "",
        status: "Absent",
        graphicsServerName: "",
        graphicsServerStatus: "",
        isReportedAbsence: true,
      };
      if (name.toLocaleLowerCase().includes(search) && matchesFilters(absentRecord)) rows.push(absentRecord);
    });
    return rows;
  });
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
      return `<tr class="record-row-${index % 2}${statusClass === "absent" ? " absent-record-row" : ""}"><td class="record-name">${escapeHtml(record.name)}${record.isReportedAbsence ? '<small class="reported-absence-label">Reported absent</small>' : ""}</td><td>${escapeHtml(record.date)}</td><td>${escapeHtml(compactTime(record.time))}</td><td>${record.isReportedAbsence ? "—" : `${Math.round(Number(record.distance))} m`}</td><td><span class="record-status status-${statusClass}">${escapeHtml(record.status || "Present")}</span></td><td>${graphicsServer}</td></tr>`;
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
  document.getElementById("records-updated").textContent = sheetsConnected ? "Live shared database records" : "No live records loaded";
}

function compactTime(time) {
  return String(time).replace(/^(\d{1,2}:\d{2}):\d{2}(\s[AP]M)$/, "$1$2");
}

function getReportFilters() {
  const dateValue = document.getElementById("record-date").value;
  const statusValue = document.getElementById("record-status").value;
  const searchValue = document.getElementById("record-search").value.trim();
  const filters = [];

  if (dateValue) {
    filters.push(`Date: ${new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-US")}`);
  }
  if (statusValue !== "all") filters.push(`Status: ${statusValue}`);
  if (searchValue) filters.push(`Name: ${searchValue}`);
  return filters.length ? filters.join(" · ") : "All attendance records";
}

function getReportLogoDataUrl() {
  const image = document.querySelector(".brand-mark");
  if (!image.complete || !image.naturalWidth) {
    throw new Error("The ministry logo has not loaded yet. Try again in a moment.");
  }

  const scale = Math.min(1, 180 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The ministry logo could not be prepared for export.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function buildAttendanceReportHtml(records, logoDataUrl) {
  const tableRows = records.length
    ? records.map((record, index) => {
      const status = String(record.status || "Present").toLocaleLowerCase();
      const statusColors = status === "absent"
        ? { background: "#e12620", color: "#fff" }
        : status === "late"
          ? { background: "#ffe5a3", color: "#684600" }
          : { background: "#c8eccd", color: "#155724" };
      const graphicsServer = record.graphicsServerName
        ? `${escapeHtml(record.graphicsServerName)}${record.graphicsServerStatus ? `<br><small>${escapeHtml(record.graphicsServerStatus)}</small>` : ""}`
        : "—";
      const nameBackground = index % 2 === 0 ? "#eee5f6" : "#ffffff";

      return `<tr>
        <td style="background:${nameBackground};font-weight:600">${escapeHtml(record.name)}</td>
        <td>${escapeHtml(record.date)}</td>
        <td>${escapeHtml(compactTime(record.time))}</td>
        <td>${record.isReportedAbsence ? "—" : `${Math.round(Number(record.distance) || 0)} m`}</td>
        <td style="text-align:center"><span style="display:block;padding:6px 8px;border-radius:4px;background:${statusColors.background};color:${statusColors.color};font-weight:bold;text-transform:lowercase">${escapeHtml(status)}</span></td>
        <td>${graphicsServer}</td>
      </tr>`;
    }).join("")
    : '<tr><td colspan="6" style="padding:24px;text-align:center;color:#aeb2bc">No attendance records match these filters.</td></tr>';
  const createdAt = new Date().toLocaleString("en-US");

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Attendance Records</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->
  <style>
    @page { size: landscape; margin: 0.55in; }
    html { color-scheme: light; }
    body { margin: 0; color: #25241f; background: #ffffff; font-family: Arial, sans-serif; }
    .report-header { width: 100%; margin-bottom: 18px; border-collapse: collapse; }
    .report-header td { border: 0; vertical-align: middle; }
    .report-logo { width: 58px; height: 58px; margin-right: 14px; }
    h1 { margin: 0 0 5px; color: #25241f; font-size: 21pt; }
    .subtitle { margin: 0; color: #62646a; font-size: 10pt; }
    .report-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .report-table th { padding: 9px 10px; border: 1px solid #5d5138; color: #302817; background: #ffedb5; text-align: left; font-size: 9pt; }
    .report-table td { padding: 8px 9px; border: 1px solid #9a927f; color: #302d27; background: #ffffff; font-size: 9pt; vertical-align: middle; overflow-wrap: anywhere; }
    .report-table th:nth-child(1) { width: 21%; }
    .report-table th:nth-child(2) { width: 15%; }
    .report-table th:nth-child(3) { width: 12%; }
    .report-table th:nth-child(4) { width: 12%; }
    .report-table th:nth-child(5) { width: 12%; }
    .report-table th:nth-child(6) { width: 28%; }
    .report-footer { margin-top: 8px; color: #62646a; font-size: 8pt; }
    @media print { html, body { color-scheme: light !important; color: #25241f !important; background: #fff !important; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <table class="report-header">
    <tr>
      <td style="width:72px"><img class="report-logo" src="${logoDataUrl}" alt="Ministry logo"></td>
      <td><h1>Attendance Records</h1><p class="subtitle">${escapeHtml(getReportFilters())}</p></td>
    </tr>
  </table>
  <table class="report-table" border="1" cellspacing="0" cellpadding="0">
    <thead><tr><th>Name</th><th>Date</th><th>Time</th><th>Distance</th><th>Status</th><th>Graphics Server / Status</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p class="report-footer">Showing ${records.length} ${records.length === 1 ? "record" : "records"} · Generated ${escapeHtml(createdAt)}</p>
</body>
</html>`;
}

function downloadReportFile(html, extension, mimeType) {
  const file = new Blob(["\ufeff", html], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ministry-attendance-records.${extension}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportWordAttendanceRecords() {
  try {
    const logoDataUrl = getReportLogoDataUrl();
    const records = getFilteredRecords();
    downloadReportFile(buildAttendanceReportHtml(records, logoDataUrl), "doc", "application/msword");
    showToast("Editable Word attendance report downloaded.");
  } catch (error) {
    showToast(error.message || "The Word report could not be created.");
  }
}

function printAttendanceRecords() {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Allow pop-ups for this site to print the attendance report.");
    return;
  }

  try {
    const logoDataUrl = getReportLogoDataUrl();
    const records = getFilteredRecords();
    printWindow.document.open();
    printWindow.document.write(buildAttendanceReportHtml(records, logoDataUrl));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    printWindow.close();
    showToast(error.message || "The attendance report could not be prepared for printing.");
  }
}

function exportRecords() {
  const records = getFilteredRecords().slice().sort((first, second) => {
    const firstDate = parseAttendanceDate(first.date);
    const secondDate = parseAttendanceDate(second.date);
    return firstDate - secondDate || timeSortValue(first.time) - timeSortValue(second.time);
  });
  const eventRecords = eventAttendanceRecords.slice().sort((first, second) =>
    parseAttendanceDate(first.date) - parseAttendanceDate(second.date) ||
    timeSortValue(first.time || "") - timeSortValue(second.time || ""),
  );
  const eventEntries = eventRecords.flatMap((eventRecord) =>
    eventRecord.attendees.map((attendee, attendeeIndex) => ({
      eventRecord,
      attendee,
      attendeeIndex,
    })),
  );
  const exportDates = [...records, ...eventRecords].map((record) => {
    const date = parseAttendanceDate(record.date);
    return { date, month: `${date.getFullYear()}-${date.getMonth()}` };
  });
  const months = [...new Set(exportDates.map(({ month }) => month))];
  const titleDate = exportDates.length
    ? exportDates.map(({ date }) => date).sort((first, second) => first - second)[0]
    : new Date();
  const monthTitle = months.length <= 1
    ? titleDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `Ministry Attendance ${titleDate.getFullYear()}`;
  const attendanceStyles = {
    present: "background-color:#c8eccd;color:#155724",
    absent: "background-color:#e12620;color:#fff",
    late: "background-color:#ffe5a3;color:#684600",
  };
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
  const graphicsAttendanceByDate = new Map();
  records.forEach((record) => {
    if (graphicsAttendanceByDate.has(record.date)) return;
    graphicsAttendanceByDate.set(record.date, getGraphicsAttendanceForDate(record.date));
  });

  const rowCount = Math.max(records.length, eventEntries.length);
  const dataRows = Array.from({ length: rowCount }, (_, index) => {
    const record = records[index];
    const eventEntry = eventEntries[index];
    const cells = [];

    if (!record) {
      cells.push('<td colspan="5"></td><td class="gutter-cell"></td><td colspan="4"></td>');
    } else {
      const date = parseAttendanceDate(record.date);
      const dateKey = record.date;
      const time = formatExportTime(record.time);
      const timeGroup = `${dateKey}|${time}`;
      const status = String(record.status || "Present").toLocaleLowerCase();
      const displayDate = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const statusClass = status === "absent" ? "absent" : status === "late" ? "late" : "present";

      if (dateKey !== previousDate) {
        cells.push(`<td class="date-cell" rowspan="${dateCounts.get(dateKey)}">${escapeHtml(displayDate)}</td>`);
      }
      if (timeGroup !== previousTimeGroup) {
        cells.push(`<td class="time-cell" rowspan="${timeCounts.get(timeGroup)}">${escapeHtml(time)}</td>`);
      }
      cells.push(`<td class="name-cell name-${index % 2}">${escapeHtml(record.name)}</td>`);
      cells.push(`<td class="attendance-cell ${statusClass}" style="${attendanceStyles[statusClass]}">${escapeHtml(status)}</td>`);
      cells.push(statusClass === "absent"
        ? '<td class="warning-cell absent-warning" style="background-color:#e12620"></td>'
        : statusClass === "present"
          ? '<td class="warning-cell present-warning"></td>'
          : '<td class="warning-cell"></td>');
      cells.push('<td class="gutter-cell"></td>');
      const graphicsAttendance = graphicsAttendanceByDate.get(dateKey);
      if (!graphicsAttendance) {
        cells.push('<td></td><td></td><td></td><td></td>');
      } else if (dateKey !== previousDate) {
        const rowSpan = dateCounts.get(dateKey);
        const graphicsStatusClass = graphicsAttendance.attendance;
        cells.push(`<td class="date-cell" rowspan="${rowSpan}">${escapeHtml(displayDate)}</td>`);
        cells.push(`<td class="name-cell name-${index % 2}" rowspan="${rowSpan}">${escapeHtml(graphicsAttendance.serverName)}</td>`);
        const graphicsStatusStyle = attendanceStyles[graphicsStatusClass];
        cells.push(`<td class="attendance-cell ${graphicsStatusClass}"${graphicsStatusStyle ? ` style="${graphicsStatusStyle}"` : ""} rowspan="${rowSpan}">${escapeHtml(graphicsAttendance.attendance)}</td>`);
        cells.push(graphicsStatusClass === "absent"
          ? `<td class="warning-cell absent-warning" style="background-color:#e12620" rowspan="${rowSpan}"></td>`
          : graphicsStatusClass === "present"
            ? `<td class="warning-cell present-warning" rowspan="${rowSpan}"></td>`
            : `<td class="warning-cell" rowspan="${rowSpan}"></td>`);
      }

      previousDate = dateKey;
      previousTimeGroup = timeGroup;
    }
    cells.push('<td class="gutter-cell"></td>');

    if (!eventEntry) {
      cells.push('<td colspan="7"></td>');
    } else if (eventEntry.attendeeIndex === 0) {
      const { eventRecord, attendee } = eventEntry;
      const attendees = eventRecord.attendees;
      const rowSpan = attendees.length;
      const date = parseAttendanceDate(eventRecord.date);
      const displayDate = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const time = eventRecord.time ? formatExportTime(eventRecord.time) : "--";
      const status = String(attendee.status || "Present").toLocaleLowerCase();
      const statusClass = ["present", "absent", "late"].includes(status) ? status : "present";
      const graphicsServer = getEventGraphicsServerData(eventRecord);
      const graphicsStatus = graphicsServer.serverName
        ? `${graphicsServer.serverName}${graphicsServer.serverStatus ? ` / ${graphicsServer.serverStatus}` : ""}`
        : "—";
      const style = attendanceStyles[statusClass];

      cells.push(`<td class="event-type-cell" rowspan="${rowSpan}">${escapeHtml(eventRecord.eventType)}</td>`);
      cells.push(`<td class="date-cell" rowspan="${rowSpan}">${escapeHtml(displayDate)}</td>`);
      cells.push(`<td class="time-cell" rowspan="${rowSpan}">${escapeHtml(time)}</td>`);
      cells.push(`<td class="graphics-server-cell" rowspan="${rowSpan}">${escapeHtml(graphicsStatus)}</td>`);
      cells.push(`<td class="name-cell name-${index % 2}">${escapeHtml(attendee.name)}</td>`);
      cells.push(`<td class="attendance-cell ${statusClass}" style="${style}">${escapeHtml(status)}</td>`);
      cells.push(statusClass === "absent"
        ? '<td class="warning-cell absent-warning" style="background-color:#e12620"></td>'
        : statusClass === "present"
          ? '<td class="warning-cell present-warning"></td>'
          : '<td class="warning-cell"></td>');
    } else {
      const { attendee } = eventEntry;
      const status = String(attendee.status || "Present").toLocaleLowerCase();
      const statusClass = ["present", "absent", "late"].includes(status) ? status : "present";
      cells.push(`<td class="name-cell name-${index % 2}">${escapeHtml(attendee.name)}</td>`);
      cells.push(`<td class="attendance-cell ${statusClass}" style="${attendanceStyles[statusClass]}">${escapeHtml(status)}</td>`);
      cells.push(statusClass === "absent"
        ? '<td class="warning-cell absent-warning" style="background-color:#e12620"></td>'
        : statusClass === "present"
          ? '<td class="warning-cell present-warning"></td>'
          : '<td class="warning-cell"></td>');
    }

    return `<tr>${cells.join("")}</tr>`;
  });

  const emptyRow = '<tr><td class="empty-cell" colspan="5">No attendance records match these filters.</td><td class="gutter-cell"></td><td class="empty-cell" colspan="4"></td><td class="gutter-cell"></td><td class="empty-cell" colspan="7">No event entries match these filters.</td></tr>';
  const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>${escapeHtml(monthTitle)}</title>
<style>
body{font-family:Arial,sans-serif;color:#201d18}table{border-collapse:collapse;table-layout:fixed;width:2523px}col.date{width:175px}col.time{width:90px}col.name{width:240px}col.attendance{width:120px}col.warning{width:110px}col.gutter{width:24px}col.event-type{width:190px}col.graphics-server{width:170px}th,td{border:1px solid #17140f;padding:5px 8px;vertical-align:middle;white-space:normal;overflow-wrap:break-word;font-size:11px}.month-title{background:#fff0c2;font-size:15px;font-style:italic;text-align:center;height:28px}.graphics-title{background:#9400d3;color:#fff;font-size:13px;font-style:italic;text-align:center}.event-title{background:#245b8f;color:#fff;font-size:13px;font-style:italic;text-align:center}.column-heading{background:#ffedb5;font-weight:bold;text-align:center}.gutter-cell{border:0;background:#fff}.date-cell,.time-cell{background:#fff8e5;text-align:center}.event-type-cell{background:#fff8e5}.graphics-server-cell{text-align:center}.name-cell{font-family:Georgia,serif;text-align:center}.name-0{background:#eee5f6}.name-1{background:#fff}.attendance-cell{text-align:center;text-transform:lowercase;font-style:italic;font-weight:bold}.present{background-color:#c8eccd;color:#155724}.absent{background-color:#e12620;color:#fff}.late{background-color:#ffe5a3;color:#684600}.warning-cell{text-align:center;font-weight:bold}.warning-cell.absent-warning{background-color:#e12620;color:#fff}.warning-cell.present-warning{background-color:#c8eccd;color:#155724}.empty-cell{height:30px;color:#777;text-align:center}
</style></head><body><table><colgroup><col class="date"><col class="time"><col class="name"><col class="attendance"><col class="warning"><col class="gutter"><col class="date"><col class="name"><col class="attendance"><col class="warning"><col class="gutter"><col class="event-type"><col class="date"><col class="time"><col class="graphics-server"><col class="name"><col class="attendance"><col class="warning"></colgroup>
<tr><th class="month-title" colspan="5" style="mso-number-format:'\\@'">${escapeHtml(monthTitle)}</th><td class="gutter-cell"></td><th class="graphics-title" colspan="4">GRAPHICS ATTENDANCE</th><td class="gutter-cell"></td><th class="event-title" colspan="7">EVENT ENTRIES</th></tr>
<tr><th class="column-heading">Date</th><th class="column-heading">Time</th><th class="column-heading">Name</th><th class="column-heading">Attendance</th><th class="column-heading">WARNING</th><td class="gutter-cell"></td><th class="column-heading">Date</th><th class="column-heading">Name</th><th class="column-heading">Attendance</th><th class="column-heading">WARNING</th><td class="gutter-cell"></td><th class="column-heading">Event</th><th class="column-heading">Date</th><th class="column-heading">Time</th><th class="column-heading">Graphics Server / Status</th><th class="column-heading">Name</th><th class="column-heading">Attendance</th><th class="column-heading">WARNING</th></tr>
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
  const rows = [["Name", "Date", "Time", "Distance", "Status", "Graphics Server", "Server Status"], ...getFilteredRecords().map((record) => [record.name, record.date, record.time, record.isReportedAbsence ? "" : `${record.distance}m`, record.status || "Present", record.graphicsServerName || "", record.graphicsServerStatus || ""])];
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

function getGraphicsAttendanceForDate(attendanceDate) {
  const [month, day, year] = String(attendanceDate).split("/");
  const isoDate = month && day && year
    ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    : "";
  const assignment = getGraphicsAssignmentForDate(isoDate);
  if (!assignment) return null;

  const dailyResponses = [...attendanceRecords, ...eventAttendanceRecords].filter((record) =>
    record.date === attendanceDate && ["Yes", "No"].includes(record.mainFiller),
  );
  const assignedServer = assignment.serverName.toLocaleLowerCase();
  const fillerRecord = dailyResponses.find((record) =>
    String(record.graphicsServerName || "").toLocaleLowerCase() === assignedServer,
  ) || dailyResponses.find((record) => !record.graphicsServerName);
  return {
    serverName: assignment.serverName,
    attendance: fillerRecord?.mainFiller === "Yes"
      ? "present"
      : fillerRecord?.mainFiller === "No"
        ? "absent"
        : "",
  };
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
    absentAttendees: absentAttendeesInput.value.slice(0, 2000),
  };
  if (draft.name || draft.mainFiller || draft.absentAttendees.trim()) writeLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY, draft);
  else removeLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY);
}

function restoreAttendanceDraft() {
  const draft = readLocalDraft(ATTENDANCE_DRAFT_STORAGE_KEY);
  if (typeof draft?.name === "string") nameInput.value = draft.name.slice(0, 80);
  attendanceMainFillerInput.value = ["Yes", "No"].includes(draft?.mainFiller) ? draft.mainFiller : "";
  if (typeof draft?.absentAttendees === "string") absentAttendeesInput.value = draft.absentAttendees.slice(0, 2000);
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
  eventMainFillerInput.value = ["Yes", "No"].includes(draft.mainFiller) ? draft.mainFiller : "";
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

  try {
    await databaseReady;
    if (!database) throw new Error("Configure Firebase before saving shared event attendance.");
    const scheduleSnapshot = await database.ref("graphicsSchedule").once("value");
    sharedGraphicsSchedule = normalizeGraphicsSchedule(scheduleSnapshot.val());
    let mainFiller = eventMainFillerInput.value;
    const eventDate = getTodayIsoDate();
    const eventReference = database.ref("eventAttendance").push();
    const graphicsServerAssignment = getGraphicsAssignmentForDate(eventDate);
    if (mainFiller) {
      if (!graphicsServerAssignment) {
        mainFiller = "";
        eventMainFillerInput.value = "";
        showToast("No Graphics server is assigned for today. The event entry will be saved without a Main Filler answer.");
      } else {
        const answerer = attendees[0]?.name || eventType;
        const claimed = await claimDailyMainFillerAnswer(
          getTodayIsoDate(),
          answerer,
          mainFiller,
          graphicsServerAssignment.serverName,
          "eventAttendance",
          eventReference.key,
        );
        mainFillerAlreadyAnsweredToday = true;
        mainFillerAvailabilityVerified = true;
        mainFillerAvailabilityError = false;
        if (!claimed) {
          mainFiller = "";
          eventMainFillerInput.value = "";
          clearMainFillerSelections();
          showToast("Someone else answered the Main Filler question first. The event entry will be saved without another answer.");
        }
        updateMainFillerAvailability();
      }
    }
    const record = {
      eventType,
      date: `${eventDate.slice(5, 7)}/${eventDate.slice(8, 10)}/${eventDate.slice(0, 4)}`,
      mainFiller,
      mainFillerDate: eventDate,
      submitterDistance: Math.round(eventSubmissionLocation.distance),
      graphicsServerName: graphicsServerAssignment?.serverName || "",
      graphicsServerStatus: graphicsServerAssignment && mainFiller
        ? mainFiller === "Yes" ? "Present" : "Absent"
        : "",
      time: new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(new Date()),
      attendees,
    };

    await eventReference.set(record);
    removeLocalDraft(EVENT_DRAFT_STORAGE_KEY);
    await loadSharedEventAttendance();
    renderEventAttendance();
    eventSubmissionLocation = null;
    eventLocationCheckedAt = 0;
    saveEventAttendanceButton.disabled = true;
    checkEventLocationButton.disabled = false;
    checkEventLocationButton.textContent = "Check Event Location";
    setEventLocationStatus("idle", "📍", "Location not checked", "The person submitting this roster must be within the attendance area.");
    document.getElementById("event-type").value = "";
    eventMainFillerInput.value = "";
    eventAttendees.innerHTML = `
      <div class="attendee-entry">
        <label class="attendee-name-field"><span>Name</span><input class="attendee-name form-control" type="text" maxlength="80" placeholder="Enter a full name" required></label>
        <label class="attendee-status-field"><span>Attendance</span><select class="attendee-status form-control"><option value="Present">Present</option><option value="Late">Late</option><option value="Absent">Absent</option></select></label>
        <button class="remove-attendee" type="button" data-remove-attendee aria-label="Remove attendee" disabled>×</button>
      </div>`;
    showToast("Event attendance saved for all site visitors.");
  } catch (error) {
    eventError.textContent = error.message || "The event roster could not be saved to the shared database.";
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
      const time = eventRecord.time ? formatExportTime(eventRecord.time) : "--";
      return `<tr><td class="event-cell">${escapeHtml(eventRecord.eventType)}</td><td class="date-cell">${escapeHtml(eventRecord.date)}</td><td class="time-cell">${escapeHtml(time)}</td><td class="filler-cell">${escapeHtml(serverStatus)}</td><td class="name-cell name-${index % 2}">${escapeHtml(attendee.name)}</td><td class="attendance-cell ${statusClass}">${escapeHtml(status)}</td><td class="warning-cell ${statusClass === "absent" ? "absent-warning" : statusClass === "present" ? "present-warning" : ""}"></td></tr>`;
    }),
  );
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;color:#201d18}table{border-collapse:collapse;table-layout:fixed;width:1120px}col.event{width:230px}col.date{width:155px}col.time{width:90px}col.name{width:210px}col.status{width:115px}col.warning{width:100px}col.filler{width:220px}th,td{border:1px solid #17140f;padding:7px 10px;vertical-align:middle;white-space:normal;overflow-wrap:break-word;font-size:11px}.title{background:#fff0c2;font-size:15px;font-style:italic;text-align:center}.heading{background:#ffedb5;font-weight:bold;text-align:center}.event-cell{background:#fff8e5}.date-cell,.time-cell{text-align:center;background:#fff8e5}.name-cell{font-family:Georgia,serif;text-align:center}.name-0{background:#eee5f6}.name-1{background:#fff}.attendance-cell{text-align:center;font-style:italic;font-weight:bold;text-transform:lowercase}.present{background:#c8eccd;color:#155724}.late{background:#ffe5a3;color:#684600}.absent{background:#e12620;color:#fff}.filler-cell{text-align:center}.warning-cell{text-align:center;font-weight:bold}.warning-cell.absent-warning{background:#e12620}.warning-cell.present-warning{background:#c8eccd;color:#155724}
  </style></head><body><table><colgroup><col class="event"><col class="date"><col class="time"><col class="filler"><col class="name"><col class="status"><col class="warning"></colgroup><tr><th class="title" colspan="7">${escapeHtml(monthTitle)}</th></tr><tr><th class="heading">Type of Event</th><th class="heading">Date</th><th class="heading">Time</th><th class="heading">Graphics Server / Status</th><th class="heading">Name</th><th class="heading">Attendance</th><th class="heading">WARNING</th></tr>${rows.length ? rows.join("") : '<tr><td colspan="7">No event attendance has been saved.</td></tr>'}</table></body></html>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ministry-event-attendance-${new Date().getFullYear()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}