/* ──────────────────────────────────────────────────────────
   LeadScout – Background service worker (MV3)
   Minimal – just keeps the extension alive and relays messages.
   ────────────────────────────────────────────────────────── */

chrome.runtime.onInstalled.addListener(() => {
  console.log("LeadScout extension installed.");
});
