/* ──────────────────────────────────────────────────────────
   Hunter – Scoring & Ranking
   ────────────────────────────────────────────────────────── */

import { LeadCandidate, ContactMethod, OutreachAngle } from "../types";

export function scoreCandidate(
  candidate: Omit<LeadCandidate, "score" | "tier" | "confidence" | "recommended_contact_method" | "suggested_outreach_angle">
): {
  score: number;
  tier: "A" | "B" | "C" | "SKIP";
  confidence: number;
  recommended_contact_method: ContactMethod;
  suggested_outreach_angle: OutreachAngle;
} {
  let score = 0;
  let confidence = 0;

  // Contact method scoring
  let recommended_contact_method: ContactMethod = "unknown";
  if (candidate.emails.length > 0) {
    score += 30;
    recommended_contact_method = "email";
    confidence += 40;
  }
  if (candidate.contact_page_url) {
    score += 15;
    if (recommended_contact_method === "unknown") {
      recommended_contact_method = "contact_form";
    }
    confidence += 20;
  }
  if (candidate.demo_booking_url) {
    score += 15;
    recommended_contact_method = "booking_link";
    confidence += 20;
  }

  // Signal keywords
  if (candidate.video_keywords.length > 0) {
    score += Math.min(candidate.video_keywords.length * 5, 20);
    confidence += 15;
  }

  // Remote signal
  if (candidate.remote_signal === "YES") {
    score += 15;
    confidence += 15;
  } else if (candidate.remote_signal === "NO") {
    score -= 20;
  }

  // Country preference
  if (candidate.country_guess === "CA") {
    score += 20;
    confidence += 10;
  } else if (candidate.country_guess === "US") {
    if (candidate.us_review_required) {
      score -= 10;
    }
  }

  // Location keywords
  if (candidate.location_keywords.length > 2) {
    score += 10;
  }

  // Careers page presence
  if (candidate.careers_page_url) {
    score += 5;
  }

  // Ensure score is in range
  score = Math.max(0, Math.min(100, score));
  confidence = Math.min(100, confidence);

  // Determine tier
  let tier: "A" | "B" | "C" | "SKIP" = "C";
  if (score >= 70) {
    tier = "A";
  } else if (score >= 45) {
    tier = "B";
  } else if (score < 20) {
    tier = "SKIP";
  }

  // Determine outreach angle
  let suggested_outreach_angle: OutreachAngle = "speed";
  if (candidate.video_keywords.includes("training") || candidate.video_keywords.includes("learning")) {
    suggested_outreach_angle = "training";
  } else if (
    candidate.video_keywords.includes("podcast") ||
    candidate.video_keywords.includes("webinar")
  ) {
    suggested_outreach_angle = "repurposing";
  } else if (candidate.remote_signal === "YES") {
    suggested_outreach_angle = "accessibility";
  }

  return {
    score,
    tier,
    confidence,
    recommended_contact_method,
    suggested_outreach_angle,
  };
}

export function rankCandidates(candidates: LeadCandidate[]): LeadCandidate[] {
  return candidates.sort((a, b) => {
    // Tier order: A > B > C > SKIP
    const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2, SKIP: 3 };
    if (tierOrder[a.tier] !== tierOrder[b.tier]) {
      return tierOrder[a.tier] - tierOrder[b.tier];
    }

    // Within tier, sort by score
    return b.score - a.score;
  });
}
