/* ──────────────────────────────────────────────────────────
   Hunter – Types
   ────────────────────────────────────────────────────────── */

export interface HunterConfig {
  rate_limit_ms: number;
  max_pages: number;
  timeout_ms: number;
  user_agent: string;
  remote_only: boolean;
  prefer_canada: boolean;
  include_us: boolean;
  debug: boolean;
  seeds_urls?: string;
  seeds_queries?: string;
  deny_domains?: string;
  out_dir?: string;
  // Server integration
  use_server: boolean;
  server_url: string;
  tier_filter: "AB" | "ABC";
  allow_us_capture: boolean;
  export_to: ("json" | "csv" | "server")[];
  // PondFinder
  refresh_seeds: boolean;
  pond_mode: "manual" | "serper";
  ponds_config?: string;
}

export interface LeadCandidate {
  domain: string;
  company_name: string;
  company_url: string;
  
  // Contact signals
  emails: string[];
  contact_page_url?: string;
  careers_page_url?: string;
  demo_booking_url?: string;
  social_links: string[];
  
  // Signal keywords
  video_keywords: string[];
  location_keywords: string[];
  
  // Derived
  country_guess: "CA" | "US" | "OTHER" | "UNKNOWN";
  remote_signal: "YES" | "NO" | "UNKNOWN";
  us_review_required: boolean;
  
  // Scoring
  score: number;
  tier: "A" | "B" | "C" | "SKIP";
  recommended_contact_method: "email" | "contact_form" | "booking_link" | "unknown";
  suggested_outreach_angle: "speed" | "accessibility" | "repurposing" | "overflow" | "training";
  confidence: number; // 0-100
  discovery_confidence: number; // 0-100, specific to PondFinder quality
  
  // PondFinder metadata
  source_query?: string; // Which query/domain this came from
  source_mode?: "manual" | "serper"; // How this URL was discovered
  
  // Metadata
  raw_html_sample?: string;
  source_url: string;
  discovered_at: string;
  processed_at?: string;
  notes?: string;
}

export interface HunterResult {
  query_date: string;
  total_discovered: number;
  candidates: LeadCandidate[];
  export_paths: {
    json?: string;
    csv?: string;
  };
}

export interface ProviderResult {
  urls: string[];
}

export type ContactMethod = "email" | "contact_form" | "booking_link" | "unknown";
export type OutreachAngle = "speed" | "accessibility" | "repurposing" | "overflow" | "training";
