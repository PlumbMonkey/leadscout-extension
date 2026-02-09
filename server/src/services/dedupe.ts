/* ──────────────────────────────────────────────────────────
   LeadScout Server – Deduplication (JSON file store)
   ────────────────────────────────────────────────────────── */

import fs from "fs";
import path from "path";
import { CONFIG } from "../config";

interface DedupeEntry {
  page_url: string;
  captured_at: string; // ISO
}

const DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadDb(): DedupeEntry[] {
  try {
    if (fs.existsSync(CONFIG.DEDUPE_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG.DEDUPE_PATH, "utf-8"));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveDb(entries: DedupeEntry[]): void {
  const dir = path.dirname(CONFIG.DEDUPE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG.DEDUPE_PATH, JSON.stringify(entries, null, 2));
}

/** Prune entries older than 7 days */
function pruneOld(entries: DedupeEntry[]): DedupeEntry[] {
  const cutoff = Date.now() - DEDUPE_WINDOW_MS;
  return entries.filter((e) => new Date(e.captured_at).getTime() > cutoff);
}

/** Check if page_url was captured in the last 7 days */
export function isDuplicate(page_url: string): boolean {
  const entries = pruneOld(loadDb());
  return entries.some((e) => e.page_url === page_url);
}

/** Record a capture */
export function recordCapture(page_url: string): void {
  let entries = pruneOld(loadDb());
  entries.push({ page_url, captured_at: new Date().toISOString() });
  saveDb(entries);
}
