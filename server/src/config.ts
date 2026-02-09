/* ──────────────────────────────────────────────────────────
   LeadScout Server – Config
   ────────────────────────────────────────────────────────── */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`❌  Missing required env var: ${key}  – see .env.example`);
    process.exit(1);
  }
  return v;
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || "3789", 10),
  GOOGLE_OAUTH_CLIENT_PATH: process.env.GOOGLE_OAUTH_CLIENT_PATH || path.resolve(__dirname, "../credentials/oauth_client.json"),
  TOKEN_PATH: process.env.TOKEN_PATH || path.resolve(__dirname, "../.tokens/token.json"),
  SHEET_ID: required("SHEET_ID"),
  SHEET_NAME: process.env.SHEET_NAME || "Leads",
  DEDUPE_PATH: path.resolve(__dirname, "../.tokens/dedupe.json"),
};
