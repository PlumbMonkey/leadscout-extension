/* ──────────────────────────────────────────────────────────
   LeadScout Server – Google Sheets writer
   ────────────────────────────────────────────────────────── */

import { google, sheets_v4 } from "googleapis";
import { CONFIG } from "../config";
import { getAuthedClient } from "./oauth";
import { LeadRow } from "@leadscout/shared";

const COLUMN_ORDER: (keyof LeadRow)[] = [
  "timestamp_iso",
  "name",
  "title",
  "company",
  "location",
  "page_url",
  "score",
  "tier",
  "evidence",
  "suggested_contact_method",
  "suggested_angle",
  "outreach_hook",
  "call_to_action",
  "onboarding_next_step",
  "status",
];

async function getSheetsAPI(): Promise<sheets_v4.Sheets> {
  const auth = await getAuthedClient();
  if (!auth) throw new Error("Not authenticated – visit /auth to connect Google.");
  return google.sheets({ version: "v4", auth });
}

/** Ensure the header row exists */
export async function ensureHeaders(): Promise<void> {
  const sheets = await getSheetsAPI();
  const range = `${CONFIG.SHEET_NAME}!A1:O1`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range,
  });

  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SHEET_ID,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [COLUMN_ORDER],
      },
    });
    console.log("📋  Header row written to sheet.");
  }
}

/** Append a single lead row */
export async function appendLeadRow(lead: LeadRow): Promise<void> {
  const sheets = await getSheetsAPI();

  const row = COLUMN_ORDER.map((col) => {
    const v = lead[col];
    return v === undefined || v === null ? "" : String(v);
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.SHEET_NAME}!A:O`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
