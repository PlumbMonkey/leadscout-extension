# LeadScout Security & Privacy

## OAuth & Secrets Management

### Credentials Are Never Committed

LeadScout uses a strict "never commit secrets" policy:

- **OAuth client JSON** → `server/credentials/oauth_client.json` (`.gitignore` protected)
- **OAuth tokens** → `server/.tokens/token.json` (`.gitignore` protected)
- **Environment variables** → `server/.env` (`.gitignore` protected)

All three are listed in `.gitignore` and will never be part of version control.

### How It Works

1. **You download** your OAuth credentials JSON from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. **You place** that file in `server/credentials/oauth_client.json`.
3. **Your first time** running the server, you visit `http://localhost:3789/auth` to authorize.
4. **The server stores** the OAuth token in `server/.tokens/token.json` (gitignored).
5. **All future requests** use the saved token — no re-authorization needed.

### Token Rotation

To re-authorize or start fresh:
```bash
rm server/.tokens/token.json
# Restart the server and visit http://localhost:3789/auth again
```

---

## Data Collection & Privacy

### What LeadScout Extracts

When you click **"Analyze Page"**, LeadScout extracts only:

- Name (best guess from visible text)
- Title / role
- Company
- Location
- Page URL
- Visible text (first 5000 chars) for signal detection
- Signal keywords found (video, producer, seniority, etc.)

### What LeadScout Does NOT Do

❌ **No crawling** — only analyzes the ONE page you're viewing
❌ **No stored HTML** — only extracted fields + keywords
❌ **No automated messaging** — all outreach is *your choice*
❌ **No background activity** — everything is user-triggered
❌ **No third-party tracking** — all processing is local

### Data Stored Locally

- **Page metadata** → appended to your Google Sheet (you control access)
- **Deduplication records** → 7-day window stored in `server/.tokens/dedupe.json`
- **Tokens** → encrypted by Google, stored only in `server/.tokens/`

---

## Compliance

### LinkedIn & Other Platforms

LeadScout respects platform policies:

- ✅ **No automation** — every action is user-triggered
- ✅ **No bulk export** — processes one page at a time
- ✅ **No circumventing ToS** — uses public page data only
- ✅ **No impersonation** — operates under your account context

Review each platform's ToS before using LeadScout with their sites.

### User-Controlled Outreach

You decide:
- **When** to capture a lead
- **How** to contact them (the "Suggested Contact Method" is a recommendation only)
- **What** to say (hooks are templates; customize before sending)

---

## Self-Hosted & Open Source

LeadScout runs entirely on your machine:

- **Server** runs on `http://localhost:3789` (no cloud connection except Sheets API)
- **Extension** communicates only with your local server and Google Sheets
- **No telemetry**, no analytics, no external services (except Google)

You own your data and can inspect all code.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "OAuth client file not found" | Move your `client_secret_*.json` to `server/credentials/oauth_client.json` |
| "Not authenticated" | Visit `http://localhost:3789/auth` and authorize |
| Accidentally committed secrets | Use `git rm --cached server/credentials/*.json` + update Google cloud credentials |
| Tokens lost after restart | OK — server will prompt you to re-authorize via `/auth` |

---

For more setup help, see [docs/SETUP.md](SETUP.md).
