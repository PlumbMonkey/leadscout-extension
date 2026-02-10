/* ──────────────────────────────────────────────────────────
   LeadScout – Shared Types
   ────────────────────────────────────────────────────────── */

/** Fields extracted from the visible DOM */
export interface ExtractedFields {
  name: string;
  title: string;
  company: string;
  location: string;
  page_url: string;
}

/** A signal keyword category and the matched phrases */
export interface SignalMatch {
  category: SignalCategory;
  matched: string[]; // exact phrases found
}

export type SignalCategory =
  | "video_production"
  | "content_marketing"
  | "seniority"
  | "remote_canada"
  | "recency"
  | "accessibility";

/** Payload sent from the content script to the popup / server */
export interface ExtractionPayload {
  extracted_fields: ExtractedFields;
  signals: SignalMatch[];
  raw_text_sample: string; // first ≤5 000 chars of visible text
}

/** POST /analyze request body */
export interface AnalyzeRequest {
  page_url: string;
  extracted_fields: ExtractedFields;
  raw_text_sample: string;
  signals: SignalMatch[];
}

/** Outreach recommendation */
export interface OutreachReco {
  suggested_contact_method: ContactMethod;
  suggested_angle: OutreachAngle;
  outreach_hook: string;   // ≤300 chars
  call_to_action: string;  // ≤180 chars
  onboarding_next_step: OnboardingStep;
}

export type ContactMethod =
  | "LinkedIn message"
  | "Email"
  | "Contact form"
  | "Comment-then-DM";

export type OutreachAngle =
  | "Speed"
  | "Accessibility"
  | "Repurposing"
  | "Overflow capacity"
  | "Training/L&D";

export type OnboardingStep =
  | "60-sec audit"
  | "10-min call"
  | "Repurposing plan"
  | "Pilot clip";

export type Tier = "A" | "B" | "C";

/** POST /analyze response */
export interface AnalyzeResponse {
  normalized_lead: ExtractedFields;
  score: number;
  tier: Tier;
  evidence: string[];
  outreach_reco: OutreachReco;
}

/** Full lead object written to Google Sheets */
export interface LeadRow {
  timestamp_iso: string;
  name: string;
  title: string;
  company: string;
  location: string;
  page_url: string;
  score: number;
  tier: Tier;
  evidence: string;          // JSON-stringified or joined
  suggested_contact_method: string;
  suggested_angle: string;
  outreach_hook: string;
  call_to_action: string;
  onboarding_next_step: string;
  status: string;            // default "new"
  pipeline_stage: string;    // default "New"
  next_action: string;       // default "Connect"
  followup_date: string;     // default ""
  notes: string;             // default ""
}

/** POST /append-lead request body */
export interface AppendLeadRequest {
  lead: LeadRow;
}

/** POST /append-lead response */
export interface AppendLeadResponse {
  success: boolean;
  message: string;
  duplicate?: boolean;
}
