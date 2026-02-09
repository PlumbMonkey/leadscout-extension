# LeadScout

> Capture lead data from any page, score & rank leads, generate outreach angles + hooks, and append to Google Sheets — all from a single click.

**Chrome Extension (Manifest V3) + Local Express Backend**

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/PlumbMonkey/leadscout-extension.git
cd leadscout-extension
npm install
npm run build
```

### 2. Google OAuth Setup

1. **Download OAuth credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable the **Google Sheets API**
   - Go to **Credentials** → **+ Create Credentials** → **OAuth Client ID**
   - Choose **Desktop Application**
   - Download the JSON file (named something like `client_secret_*.json`)

2. **Place credentials in the project:**
   ```bash
   # Move the downloaded JSON to the credentials folder
   mv ~/Downloads/client_secret_*.json server/credentials/oauth_client.json
   ```

3. **Create `.env` file:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env and fill in SHEET_ID (from your Google Sheet URL)
   ```

4. **Authorize the app:**
   ```bash
   npm run dev:server
   # Visit http://localhost:3789/auth in your browser
   # Sign in and grant Sheets access – you'll see a confirmation page
   ```

### 3. Load the Extension

**Chrome:**
```
chrome://extensions → Developer mode (top-right) → Load unpacked → select /extension folder
```

**Brave:**
```
brave://extensions → Developer mode (top-right) → Load unpacked → select /extension folder
```

---

## Features (MVP)

- **One-click extraction** — reads visible DOM of the current tab (no crawling)
- **Smart scoring** (0–100) with weighted signal detection
- **Tiered ranking** — A / B / C tier classification
- **Outreach recommendations** — deterministic hook, CTA, and contact method
- **Google Sheets integration** — append leads with deduplication
- **LinkedIn heuristics** — best-effort extraction from profile pages
- **Privacy-first** — no page HTML stored, only extracted fields + signals

## Stack

- TypeScript (everywhere)
- Chrome Extension Manifest V3
- Express.js backend
- Google Sheets API (OAuth 2.0)

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for details on:
- OAuth credential handling
- Token storage
- No automated crawling or messaging
- Local-only analysis

## License

MIT
