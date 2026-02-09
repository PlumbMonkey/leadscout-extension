/* ──────────────────────────────────────────────────────────
   LeadScout Server – Express entry point
   ────────────────────────────────────────────────────────── */

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { CONFIG } from "./config";
import {
  createOAuth2Client,
  getAuthUrl,
  loadToken,
  saveToken,
} from "./services/oauth";

import analyzeRouter from "./routes/analyze";
import appendRouter from "./routes/append";
import healthRouter from "./routes/health";

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "256kb" }));

// ── Routes ─────────────────────────────────────────────────
app.use("/analyze", analyzeRouter);
app.use("/append-lead", appendRouter);
app.use("/health", healthRouter);

// ── OAuth routes ───────────────────────────────────────────

/** GET /auth – redirect user to Google consent screen */
app.get("/auth", (_req, res) => {
  const url = getAuthUrl();
  console.log("\n🔗  Open this URL to authorize Google Sheets:\n", url, "\n");
  res.redirect(url);
});

/** GET /oauth2callback – Google redirects here with ?code= */
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.status(400).send("Missing authorization code.");
    return;
  }

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    saveToken(tokens);
    console.log("✅  Google Sheets token saved!");
    res.send(
      "<h2>✅ LeadScout connected to Google Sheets!</h2><p>You can close this tab and return to the extension.</p>"
    );
  } catch (err: any) {
    console.error("OAuth error:", err);
    res.status(500).send("OAuth token exchange failed: " + err.message);
  }
});

// ── Start ──────────────────────────────────────────────────
app.listen(CONFIG.PORT, () => {
  console.log(`\n🚀  LeadScout server running on http://localhost:${CONFIG.PORT}`);
  
  // Check OAuth client file
  if (!fs.existsSync(CONFIG.GOOGLE_OAUTH_CLIENT_PATH)) {
    console.error(
      `\n❌  OAuth client file not found!`
    );
    console.error(
      `    Expected: ${CONFIG.GOOGLE_OAUTH_CLIENT_PATH}`
    );
    console.error(`    Move your Desktop client JSON from Google Cloud Console to that location.\n`);
  } else {
    console.log("✅  OAuth client file found");
  }
  
  // Check token
  const token = loadToken();
  if (token) {
    console.log("🔑  Google Sheets: authenticated (token found)");
  } else {
    console.log(`🔑  Google Sheets: NOT connected – visit http://localhost:${CONFIG.PORT}/auth to authorize`);
  }
  console.log("");
});
