/* ──────────────────────────────────────────────────────────
   LeadScout – Scoring Engine (deterministic, no LLM)
   ────────────────────────────────────────────────────────── */

import {
  SignalMatch,
  ExtractedFields,
  Tier,
} from "./types";

// ── Weight buckets ─────────────────────────────────────────

const MAX_VIDEO_PRODUCTION = 30;
const MAX_CONTENT_MARKETING = 25;
const MAX_SENIORITY = 15;
const MAX_REMOTE_CANADA = 10;
const MAX_RECENCY = 10;
const MAX_ACCESSIBILITY = 10;

// ── Keyword dictionaries ───────────────────────────────────

export const SIGNAL_KEYWORDS: Record<string, string[]> = {
  video_production: [
    "video",
    "producer",
    "webinar",
    "podcast",
    "training video",
    "explainer",
    "animation",
    "motion graphics",
    "post-production",
    "editing",
    "filmmaker",
    "videographer",
  ],
  content_marketing: [
    "content",
    "marketing",
    "comms",
    "communications",
    "brand",
    "campaigns",
    "content ops",
    "internal comms",
    "enablement",
    "social media",
    "demand gen",
  ],
  seniority: [
    "manager",
    "director",
    "head of",
    "vp ",
    "vice president",
    "lead",
    "senior",
    "chief",
    "founder",
    "co-founder",
    "principal",
  ],
  remote_canada: [
    "remote",
    "canada",
    "canadian",
    "toronto",
    "vancouver",
    "montreal",
    "ottawa",
    "calgary",
  ],
  recency: [
    "just posted",
    "1 day ago",
    "2 days ago",
    "3 days ago",
    "days ago",
    "hours ago",
    "1 week ago",
    "weeks ago",
    "recently",
    "new role",
    "just started",
  ],
  accessibility: [
    "accessibility",
    "captions",
    "closed captions",
    "subtitles",
    "wcag",
    "ada compliant",
    "sound-off",
    "readable",
    "inclusive design",
    "alt text",
  ],
};

// ── Detect signals from raw text ───────────────────────────

export function detectSignals(rawText: string): SignalMatch[] {
  const lower = rawText.toLowerCase();
  const results: SignalMatch[] = [];

  for (const [category, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
    const matched: string[] = [];
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        matched.push(kw);
      }
    }
    if (matched.length > 0) {
      results.push({
        category: category as SignalMatch["category"],
        matched,
      });
    }
  }
  return results;
}

// ── Compute score ──────────────────────────────────────────

function bucketScore(matched: number, max: number, perHit: number): number {
  return Math.min(matched * perHit, max);
}

export function computeScore(
  signals: SignalMatch[],
  fields: ExtractedFields
): { score: number; tier: Tier; evidence: string[] } {
  const lookup = (cat: string) =>
    signals.find((s) => s.category === cat)?.matched ?? [];

  let score = 0;
  const evidence: string[] = [];

  // 1. Video / production / webinar / podcast / training (up to 30)
  const vidMatches = lookup("video_production");
  score += bucketScore(vidMatches.length, MAX_VIDEO_PRODUCTION, 8);
  vidMatches.slice(0, 3).forEach((m) => evidence.push(`🎬 ${m}`));

  // 2. Content / marketing / comms / brand (up to 25)
  const cmMatches = lookup("content_marketing");
  score += bucketScore(cmMatches.length, MAX_CONTENT_MARKETING, 7);
  cmMatches.slice(0, 2).forEach((m) => evidence.push(`📢 ${m}`));

  // 3. Seniority (up to 15)
  const senMatches = lookup("seniority");
  // Also check title field directly
  const titleLower = fields.title.toLowerCase();
  const titleSeniorityHits = SIGNAL_KEYWORDS.seniority.filter((kw) =>
    titleLower.includes(kw)
  );
  const allSeniority = [...new Set([...senMatches, ...titleSeniorityHits])];
  score += bucketScore(allSeniority.length, MAX_SENIORITY, 8);
  if (allSeniority.length > 0) evidence.push(`👤 seniority: ${allSeniority[0]}`);

  // 4. Remote / Canada (up to 10)
  const rcMatches = lookup("remote_canada");
  const locLower = fields.location.toLowerCase();
  const locHits = SIGNAL_KEYWORDS.remote_canada.filter((kw) =>
    locLower.includes(kw)
  );
  const allRC = [...new Set([...rcMatches, ...locHits])];
  score += bucketScore(allRC.length, MAX_REMOTE_CANADA, 5);
  if (allRC.length > 0) evidence.push(`🌍 ${allRC[0]}`);

  // 5. Recency (up to 10)
  const recMatches = lookup("recency");
  score += bucketScore(recMatches.length, MAX_RECENCY, 5);
  if (recMatches.length > 0) evidence.push(`🕒 ${recMatches[0]}`);

  // 6. Accessibility / captions (up to 10)
  const accMatches = lookup("accessibility");
  score += bucketScore(accMatches.length, MAX_ACCESSIBILITY, 5);
  if (accMatches.length > 0) evidence.push(`♿ ${accMatches[0]}`);

  // Clamp
  score = Math.min(score, 100);

  // Tier
  const tier: Tier = score >= 75 ? "A" : score >= 50 ? "B" : "C";

  return { score, tier, evidence: evidence.slice(0, 5) };
}
