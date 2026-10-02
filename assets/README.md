# Commission on Social Communication | Ministry Attendance

This is a beginner-friendly GPS attendance website made with plain HTML, CSS, and JavaScript. Google Apps Script checks every submission and writes approved attendance to Google Sheets. No accounts, logins, or passwords are used.

## Project files

- `index.html` — page structure and attendance states.
- `style.css` — responsive visual styles.
- `script.js` — browser location flow, distance preview, and Apps Script request.
- `apps-script/Code.gs` — server-side validation, duplicate check, timestamp, and Sheets write.
- The `Records` and `Location` tabs are inside `index.html`; no extra framework or page bundle is needed.

## Configure the attendance point

Edit these values at the top of `script.js` and set the same values at the top of `apps-script/Code.gs`:

```js
const ATTENDANCE_LATITUDE = 14.5995;
const ATTENDANCE_LONGITUDE = 120.9842;
const ATTENDANCE_RADIUS = 100;
```

The browser uses these values for its estimate and for the Location settings preview. Google Apps Script repeats the distance calculation and makes the final decision, so copy any official location changes into `apps-script/Code.gs` and redeploy it too. The browser-only Save Location setting does not change the server's official geofence.

## Connect Google Sheets

1. Create a Google spreadsheet and copy its ID from the spreadsheet URL.
2. Open [script.google.com](https://script.google.com), create a project, and paste in `apps-script/Code.gs`.
3. Replace `PASTE_YOUR_SPREADSHEET_ID_HERE` in `Code.gs` with the spreadsheet ID.
4. In Apps Script, choose **Deploy → New deployment → Web app**. Set **Execute as** to yourself and **Who has access** to anyone, then deploy and authorize access to the spreadsheet.
5. Copy the web app URL ending in `/exec` into `GOOGLE_APPS_SCRIPT_URL` near the top of `script.js`.
6. Deploy a new version of the Apps Script after changing its code.

The script creates the `Attendance` sheet and header row when needed. It stores `Name`, `Date`, `Time`, `Latitude`, `Longitude`, `Distance`, and `Status`. A script lock keeps the duplicate check and row append together, including simultaneous submissions. Its `doGet` endpoint supplies rows to the Records tab.

## Records and location settings

Use **Records** in the top navigation to search by name, filter by date/status, refresh from Sheets, or export the current filtered rows as CSV. Until the Apps Script URL is configured, the page shows no attendance rows and a disconnected indicator. Use **Location** to preview/save a location name, coordinates, and radius in this browser. For actual attendance acceptance, update the matching constants in `Code.gs` and redeploy; a public browser setting cannot safely change the server's official geofence.

## Run and deploy

Open `index.html` in a browser for the layout. Location services require a secure context: use `localhost` during local testing, or deploy to HTTPS. To test actual Sheets requests, use a static local server such as VS Code Live Server after setting the Apps Script URL.

For Vercel, import this folder as a static project, choose **Other** as the framework preset, and use the project root as the output. There is no build command or package installation.

## Notes

GPS is approximate and browser coordinates can be manipulated. The Apps Script check protects against trusting a client-provided distance, but it cannot prove that a coordinate came from an untampered GPS sensor. The Apps Script URL is public by design; do not put private credentials in `script.js`.

Because this no-login prototype deploys the Apps Script as accessible to anyone, its records `doGet` endpoint is also public. Do not use real sensitive attendance data until access controls are added.
