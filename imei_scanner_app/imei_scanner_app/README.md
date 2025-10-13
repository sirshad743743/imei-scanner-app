# IMEI Scanner Web App (Buyer/Seller)

A lightweight Python (Flask) web application with a modern, responsive UI that opens the device camera, OCRs the frame to detect **IMEI** numbers only (lines that contain or start with `IMEI`), auto-copies them to the clipboard, and saves the data (Buyer/Seller + Name + IMEIs) to a Google Sheet via a **Google Apps Script Web App URL** you can modify.

## Features
- Two cards on a single page: **Buyer** and **Seller**.
- Opens camera, scans visible text, extracts **IMEI** numbers (supports multiple).
- Automatically copies extracted IMEIs to clipboard.
- Save results with a given **Name** (per role) to Google Sheets via your Apps Script URL.
- Fully responsive (mobile, tablet, desktop) and smooth UI.
- 100% free stack: Flask + vanilla JS + Tesseract.js (OCR) + Google Apps Script.

---
## Quick Start

1. **Create Google Apps Script (to append to a Google Sheet)**

   - Create a Google Sheet with headers in row 1, e.g.: `Timestamp, Role, Name, IMEIs, Raw Text, User Agent`.
   - Open https://script.google.com/ and create a **new project**.
   - Paste the code from `scripts/google_apps_script.js` into the editor (replace any existing code).
   - In the script, set `SHEET_ID` to your Sheet ID (part of the URL between `/d/` and `/edit`).
   - Click **Deploy > Test deployments** once (optional), then **Deploy > Manage deployments > New deployment > type: Web app**.
     - Execute as **Me**.
     - Who has access: **Anyone** (or Anyone with the link).
   - Copy the **Web App URL**.

2. **Configure this app**

   - Option A (Client direct): edit `static/config.js` and set:
     ```js
     window.GOOGLE_SHEETS_WEBAPP_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
     window.SAVE_VIA = 'client'; // direct from browser to Apps Script
     ```
   - Option B (Server proxy): edit `config.json` and set:
     ```json
     {"GOOGLE_SHEETS_WEBAPP_URL": "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE"}
     ```
     and in `static/config.js` set `window.SAVE_VIA = 'server';`

3. **Run locally**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   flask --app app.py run --debug
   ```
   Visit: http://127.0.0.1:5000

   > Note: Browsers typically require **HTTPS or localhost** for camera access. Running locally on `localhost` is fine.

4. **Usage**
   - Click **Buyer** or **Seller** card → **Scan IMEI**.
   - Grant camera permission. Hold the IMEI label in view and press **Scan**.
   - Extracted IMEIs appear; they are auto-copied to clipboard.
   - Enter **Name**, click **Save to Google Sheet**.

---
## How IMEIs are detected
- The app uses **Tesseract.js** (on-device OCR) in the browser.
- It looks for lines containing `IMEI` and extracts 15-digit sequences (standard IMEI length), allowing minor OCR noise.
- It deduplicates and validates by pattern: a 15-digit number (Luhn check optional; here we keep it simple to avoid false negatives).

---
## Fallback CSV (optional)
If you prefer not to use Google Sheets yet, the server will append to `data.csv` when `GOOGLE_SHEETS_WEBAPP_URL` is **not** set and `SAVE_VIA = 'server'`.

---
## Deployment tips
- Use any free Python hosting (e.g., Render free tier, Railway free plan, etc.). Ensure HTTPS so mobile browsers allow the camera.
- If deploying behind a proxy, confirm correct CORS settings. The provided Apps Script adds `Access-Control-Allow-Origin: *`.

---
## License
MIT
