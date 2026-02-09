# LeadScout – Setup Guide

> Chrome Extension (MV3) + Local Backend for lead capture, scoring & outreach.

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Google account** with access to Google Sheets
- **Google Chrome** (or Chromium-based browser)

---

## 1. Clone & Install

```bash
git clone https://github.com/PlumbMonkey/leadscout-extension.git
cd leadscout-extension
npm install
```

---

## 2. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click **New Project** → name it `LeadScout` → **Create**.
3. Select the project.

### Enable the Google Sheets API

1. Navigate to **APIs & Services → Library**.
2. Search for **Google Sheets API** → click **Enable**.

### Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**.
2. Click **+ CREATE CREDENTIALS → OAuth client ID**.
3. If prompted, configure the **OAuth consent screen**:
   - User type: **External** (or Internal if using Workspace).
   - App name: `LeadScout`
   - Scopes: add `https://www.googleapis.com/auth/spreadsheets`
   - Add your email as a test user.
4. Back in Credentials → **Application type: Web application**.
5. **Authorized redirect URIs**: add `http://localhost:3789/oauth2callback`
6. Click **Create** → copy the **Client ID** and **Client Secret**.

---

## 3. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) → create a new spreadsheet.
2. Name it whatever you like (e.g., `LeadScout Pipeline`).
3. Rename the first sheet tab to `Leads` (or whatever you set as `SHEET_NAME`).
4. Copy the **spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

---

## 4. Configure the Server

1. Copy the example env file:
   ```bash
   cd server
   cp .env.example .env
   ```
2. Edit `server/.env` and fill in:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3789/oauth2callback
   SHEET_ID=your-spreadsheet-id
   SHEET_NAME=Leads
   PORT=3789
   ```

---

## 5. Build Everything

From the repo root:

```bash
npm run build
```

This compiles `shared` → `server` → `extension` in order.

---

## 6. Authorize Google Sheets

Start the server:

```bash
npm run dev:server
```

Then open your browser to:

```
http://localhost:3789/auth
```

- Sign in with your Google account.
- Grant Sheets access.
- You'll see a "✅ LeadScout connected to Google Sheets!" confirmation.
- The token is saved to `server/.tokens/token.json`.

---

## 7. Load the Chrome Extension

1. Open Chrome → navigate to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `/extension` folder (the one containing `manifest.json`).
5. Pin the LeadScout extension to your toolbar.

---

## 8. Use LeadScout

1. **Ensure the server is running** (`npm run dev:server`).
2. Browse to any page (LinkedIn profile, company team page, job listing, etc.).
3. Click the **LeadScout** icon in the toolbar to open the popup.
4. Click **⚡ Analyze Page** — the extension extracts data, sends it to the local server for scoring.
5. Review the results: Name, Title, Company, Score, Tier, Evidence, Outreach recommendation.
6. Click **📥 Capture Lead** — the lead is appended to your Google Sheet.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Not authenticated" error | Visit `http://localhost:3789/auth` to re-authorize |
| Server won't start | Check `server/.env` is configured correctly |
| Extension shows "Failed to fetch" | Make sure the server is running on port 3789 |
| No data extracted | The extension does best-effort extraction; some sites may return empty fields but should still detect signals |
| Duplicate lead warning | The same `page_url` can't be captured again within 7 days |

---

## Project Structure

```
leadscout-extension/
├── shared/            # Shared types, scoring engine, outreach rules
│   └── src/
│       ├── types.ts
│       ├── scoring.ts
│       ├── outreach.ts
│       └── index.ts
├── server/            # Express backend (Sheets API, OAuth, analysis)
│   └── src/
│       ├── index.ts
│       ├── config.ts
│       ├── routes/
│       │   ├── analyze.ts
│       │   ├── append.ts
│       │   └── health.ts
│       └── services/
│           ├── oauth.ts
│           ├── sheets.ts
│           └── dedupe.ts
├── extension/         # Chrome MV3 extension
│   ├── manifest.json
│   ├── popup.html
│   ├── icons/
│   └── src/
│       ├── popup.ts
│       ├── content.ts
│       └── background.ts
└── docs/
    └── SETUP.md
```
