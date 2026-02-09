/* ──────────────────────────────────────────────────────────
   LeadScout Server – OAuth helper (Google Sheets)
   ────────────────────────────────────────────────────────── */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { CONFIG } from "../config";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/** Load OAuth credentials from JSON file (Desktop client from Google Cloud) */
function loadOAuthCredentials(): { client_id: string; client_secret: string; redirect_uris: string[] } {
  try {
    if (!fs.existsSync(CONFIG.GOOGLE_OAUTH_CLIENT_PATH)) {
      throw new Error(`OAuth client file not found – check GOOGLE_OAUTH_CLIENT_PATH: ${CONFIG.GOOGLE_OAUTH_CLIENT_PATH}`);
    }
    const raw = fs.readFileSync(CONFIG.GOOGLE_OAUTH_CLIENT_PATH, "utf-8");
    const data = JSON.parse(raw);
    // Google CLI JSON structure: { "installed": { "client_id": "...", "client_secret": "...", "redirect_uris": [...] } }
    const installed = data.installed || data;
    if (!installed.client_id || !installed.client_secret) {
      throw new Error("Invalid OAuth JSON format – missing client_id or client_secret");
    }
    return {
      client_id: installed.client_id,
      client_secret: installed.client_secret,
      redirect_uris: installed.redirect_uris || ["http://localhost:3789/oauth2callback"],
    };
  } catch (err: any) {
    console.error(`❌  Failed to load OAuth credentials: ${err.message}`);
    throw err;
  }
}

export function createOAuth2Client() {
  const creds = loadOAuthCredentials();
  return new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    creds.redirect_uris[0] || "http://localhost:3789/oauth2callback"
  );
}

/** Load saved token if it exists */
export function loadToken(): object | null {
  try {
    if (fs.existsSync(CONFIG.TOKEN_PATH)) {
      const raw = fs.readFileSync(CONFIG.TOKEN_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

/** Persist token to disk */
export function saveToken(token: object): void {
  const dir = path.dirname(CONFIG.TOKEN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG.TOKEN_PATH, JSON.stringify(token, null, 2));
}

/** Get an authenticated OAuth2 client, prompting in console if needed */
export async function getAuthedClient() {
  const client = createOAuth2Client();
  const saved = loadToken();

  if (saved) {
    client.setCredentials(saved as any);
    return client;
  }

  // No token – the /oauth2callback route will handle it
  return null;
}

/** Generate the consent URL */
export function getAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}
