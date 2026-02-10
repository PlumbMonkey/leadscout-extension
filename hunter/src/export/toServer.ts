/* ──────────────────────────────────────────────────────────
   Hunter – Server Integration (LeadScout /analyze and /append-lead)
   ────────────────────────────────────────────────────────── */

import fetch from "node-fetch";
import { LeadCandidate } from "../types";
import { Logger } from "../utils/logger";
import { SignalMatch } from "@leadscout/shared";

export interface ServerAnalyzeResponse {
  normalized_lead: {
    name: string;
    title: string;
    company: string;
    location: string;
    page_url: string;
  };
  score: number;
  tier: "A" | "B" | "C";
  evidence: string[];
  outreach_reco: {
    suggested_contact_method: string;
    suggested_angle: string;
    outreach_hook: string;
    call_to_action: string;
    onboarding_next_step: string;
  };
}

export interface ServerAppendResponse {
  success: boolean;
  message: string;
  duplicate?: boolean;
}

/**
 * Score a candidate using the LeadScout server's /analyze endpoint
 */
export async function scoreWithServer(
  candidate: Omit<
    LeadCandidate,
    "score" | "tier" | "confidence" | "recommended_contact_method" | "suggested_outreach_angle"
  >,
  serverUrl: string,
  logger: Logger
): Promise<{
  score: number;
  tier: "A" | "B" | "C";
  outreachReco: ServerAnalyzeResponse["outreach_reco"];
  error?: string;
}> {
  try {
    // Build signals from Hunter's extracted data
    const signals: SignalMatch[] = [];

    // Add video/content marketing signals
    if (candidate.video_keywords.length > 0) {
      signals.push({
        category: "video_production",
        matched: candidate.video_keywords,
      });
    }

    // Add remote+Canada location signals
    if (candidate.remote_signal === "YES" || candidate.location_keywords.includes("remote")) {
      signals.push({
        category: "remote_canada",
        matched: candidate.location_keywords.filter(
          (k) => k.toLowerCase().includes("remote") || k.toLowerCase().includes("canada")
        ),
      });
    }

    // Build AnalyzeRequest payload
    const analyzePayload = {
      page_url: candidate.company_url,
      extracted_fields: {
        name: candidate.company_name,
        title: "Lead from Hunter discovery",
        company: candidate.company_name,
        location: candidate.country_guess === "CA" ? "Canada" : candidate.country_guess,
        page_url: candidate.company_url,
      },
      raw_text_sample: candidate.raw_html_sample || "",
      signals,
    };

    const response = await fetch(`${serverUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analyzePayload),
      timeout: 15000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(
        "ServerScore",
        `Server returned ${response.status} for ${candidate.company_url}: ${errorText.slice(0, 100)}`
      );
      return {
        score: 0,
        tier: "C",
        outreachReco: {
          suggested_contact_method: "unknown",
          suggested_angle: "Speed",
          outreach_hook: "",
          call_to_action: "",
          onboarding_next_step: "60-sec audit",
        },
        error: `Server error: ${response.status}`,
      };
    }

    const analyzed = (await response.json()) as ServerAnalyzeResponse;

    return {
      score: analyzed.score,
      tier: analyzed.tier,
      outreachReco: analyzed.outreach_reco,
    };
  } catch (error: any) {
    logger.warn(
      "ServerScore",
      `Failed to score ${candidate.company_url} with server: ${error.message}`
    );
    return {
      score: 0,
      tier: "C",
      outreachReco: {
        suggested_contact_method: "unknown",
        suggested_angle: "Speed",
        outreach_hook: "",
        call_to_action: "",
        onboarding_next_step: "60-sec audit",
      },
      error: error.message,
    };
  }
}

/**
 * Append a candidate to Google Sheets via the LeadScout server's /append-lead endpoint
 */
export async function appendLeadToServer(
  candidate: LeadCandidate,
  serverUrl: string,
  logger: Logger
): Promise<boolean> {
  try {
    const leadRow = {
      timestamp_iso: new Date().toISOString(),
      name: candidate.company_name,
      title: "Hunter Discovery",
      company: candidate.company_name,
      location: candidate.country_guess,
      page_url: candidate.company_url,
      score: candidate.score,
      tier: candidate.tier,
      evidence: candidate.raw_html_sample?.slice(0, 500) || "Hunter discovery",
      suggested_contact_method: candidate.recommended_contact_method,
      suggested_angle: candidate.suggested_outreach_angle,
      outreach_hook: `Discovered via Hunter: ${candidate.company_name}`,
      call_to_action: "Schedule a call",
      onboarding_next_step: "60-sec audit",
      status: "new",
      pipeline_stage: "New",
      next_action: "Connect",
      followup_date: "",
      notes: `US Review: ${candidate.us_review_required}. Keywords: ${candidate.video_keywords.join(", ")}`,
    };

    const response = await fetch(`${serverUrl}/append-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead: leadRow }),
      timeout: 15000,
    });

    const result = (await response.json()) as ServerAppendResponse;

    if (result.success) {
      logger.log("ServerAppend", `✓ Appended ${candidate.company_name} to Google Sheets`);
      return true;
    } else {
      if (result.duplicate) {
        logger.debug_log("ServerAppend", `Skipped ${candidate.company_name} (duplicate)`);
      } else {
        logger.warn("ServerAppend", `Failed to append ${candidate.company_name}: ${result.message}`);
      }
      return false;
    }
  } catch (error: any) {
    logger.debug_log(
      "ServerAppend",
      `Could not append ${candidate.company_name} to server: ${error.message}`
    );
    return false;
  }
}
