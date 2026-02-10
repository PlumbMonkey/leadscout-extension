/* ──────────────────────────────────────────────────────────
   Hunter – Normalization
   ────────────────────────────────────────────────────────── */

import { extractDomain } from "../utils/strings";

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function inferCompanyName(url: string, pageTitle: string): string {
  let name = "";

  // Try to extract from URL domain
  const domain = extractDomain(url);
  if (domain) {
    // Remove common TLDs and hyphens
    name = domain
      .split(".")[0]
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  // If we have page title, use it if it's reasonable
  if (pageTitle && pageTitle.length < 100 && pageTitle.length > 3) {
    name = pageTitle.split("|")[0].split("-")[0].trim();
  }

  return name || "Unknown";
}

export function countryGuess(text: string, domain: string): "CA" | "US" | "OTHER" | "UNKNOWN" {
  const lower = text.toLowerCase() + " " + domain.toLowerCase();

  const caIndicators = [
    "canada",
    "canadian",
    ".ca",
    "toronto",
    "vancouver",
    "montreal",
    "calgary",
    "ottawa",
    "winnipeg",
    "provincial",
    "province",
  ];

  const usIndicators = [
    "united states",
    "america",
    "usa",
    ".us",
    "new york",
    "los angeles",
    "san francisco",
    "texas",
    "california",
  ];

  const caMatches = caIndicators.filter((i) => lower.includes(i)).length;
  const usMatches = usIndicators.filter((i) => lower.includes(i)).length;

  if (caMatches > 0 && caMatches > usMatches) return "CA";
  if (usMatches > 0) return "US";
  if (domain.endsWith(".ca")) return "CA";
  if (domain.endsWith(".us")) return "US";

  return "UNKNOWN";
}

export function remoteSignal(text: string): "YES" | "NO" | "UNKNOWN" {
  const lower = text.toLowerCase();

  const remoteIndicators = [
    "remote",
    "distributed",
    "work from",
    "wfh",
    "async",
    "global",
    "anywhere",
  ];
  const officeIndicators = ["on-site", "onsite", "in-office", "office required", "location required"];

  const remoteMatches = remoteIndicators.filter((i) => lower.includes(i)).length;
  const officeMatches = officeIndicators.filter((i) => lower.includes(i)).length;

  if (remoteMatches > 0 && remoteMatches > officeMatches) return "YES";
  if (officeMatches > 0) return "NO";

  return "UNKNOWN";
}
