# Commission on Social Communication | Ministry Attendance

Static HTML/CSS/JavaScript attendance site. Firebase Realtime Database provides shared attendance, event entries, Graphics schedule, and location settings; Firebase anonymous authentication is used for database access. There is no Apps Script backend.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. In **Authentication → Sign-in method**, enable **Anonymous**.
3. Create a **Realtime Database**. Copy its exact database URL from the Firebase console.
4. In **Realtime Database → Rules**, paste the contents of `database.rules.json` and publish.
5. In Firebase **Project settings → General → Your apps**, copy the web app `apiKey`, `projectId`, and `appId` into `FIREBASE_CONFIG` near the top of `script.js`. Set `authDomain` to `<project-id>.firebaseapp.com` and set `databaseURL` to the exact URL copied in step 3.
6. In **Authentication → Settings → Authorized domains**, add the deployed Vercel hostname.
7. Deploy the updated static site to Vercel.

If the site is already deployed, publish the updated `database.rules.json` before deploying this version. These rules enforce the one-per-day Main Filler answer across attendance and event entries and permit clearing the three record collections.

The Firebase web config is intended to be present in browser code; the database rules, not config secrecy, control access. The rules permit signed-in anonymous visitors to read all records and append attendance/event entries. They also permit any visitor to change the shared schedule and location because those controls are exposed in the site. Do not store sensitive personal information. GPS validation now runs in the browser and can be manipulated. The daily Main Filler answer uses an atomic Realtime Database claim so only one answer can be recorded across attendance and event entries each day.

## Shared data

Firebase listeners update attendance records, event entries, schedule, and location for all visitors in real time. The attendance form can optionally record absent attendees, one name per line; those names are included as Absent rows in Records and its exports. **Records** supports search, date/status filters, CSV and Excel exports. Event entries, graphics assignments, and location settings are saved centrally. Existing rows in the old Google Sheet are not automatically migrated; import or re-enter them if needed.

## Appearance

Use the header control to switch between light and dark mode. The chosen theme is saved in this browser.

In **Records**, use **Print** for a print-ready report or **Word** to download an editable Word document. Both exports use the current name, date, and status filters and include the ministry logo. The Excel export lists only the assigned Graphics server once per day, with that day's Main Filler answer. Its attendance and Graphics warning columns are green for present and red with a warning for absent. **Clear Records** requires the Location settings password and the confirmation phrase `delete the records`; it permanently removes attendance, event attendance, and daily Main Filler answers from Firebase. The password check is client-side only, and the database rules permit any signed-in visitor to clear these collections, so this is a confirmation safeguard, not secure administrator authorization.

For map selection, optionally enable **Maps JavaScript API** in Google Cloud, restrict its browser key to the deployed site, and set `GOOGLE_MAPS_API_KEY` in `script.js`.

## Run and deploy

Serve the site locally over `localhost` for GPS access or deploy over HTTPS. In Vercel, use the project root as a static project with no build command.
