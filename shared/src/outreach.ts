/* ──────────────────────────────────────────────────────────
   LeadScout – Outreach Recommendation Engine
   Deterministic rules for MVP; LLM stub interface included.
   ────────────────────────────────────────────────────────── */

import {
  SignalMatch,
  ExtractedFields,
  OutreachReco,
  ContactMethod,
  OutreachAngle,
  OnboardingStep,
  Tier,
} from "./types";

// ── LLM stub interface (for future use) ────────────────────

export interface LLMOutreachProvider {
  generateOutreach(
    fields: ExtractedFields,
    signals: SignalMatch[],
    score: number,
    tier: Tier
  ): Promise<OutreachReco>;
}

// ── Deterministic rule engine ──────────────────────────────

function hasCategory(signals: SignalMatch[], cat: string): boolean {
  return signals.some((s) => s.category === cat);
}

function pickContactMethod(
  fields: ExtractedFields,
  signals: SignalMatch[]
): ContactMethod {
  const url = fields.page_url.toLowerCase();
  if (url.includes("linkedin.com")) return "LinkedIn message";
  if (hasCategory(signals, "content_marketing")) return "Comment-then-DM";
  if (fields.company) return "Email";
  return "Contact form";
}

function pickAngle(signals: SignalMatch[]): OutreachAngle {
  if (hasCategory(signals, "accessibility")) return "Accessibility";
  if (hasCategory(signals, "video_production")) return "Speed";
  if (hasCategory(signals, "content_marketing")) return "Repurposing";
  if (
    signals.some(
      (s) =>
        s.category === "video_production" &&
        s.matched.some((m) => m.includes("training"))
    )
  )
    return "Training/L&D";
  return "Overflow capacity";
}

function pickOnboardingStep(angle: OutreachAngle): OnboardingStep {
  switch (angle) {
    case "Speed":
      return "Pilot clip";
    case "Accessibility":
      return "60-sec audit";
    case "Repurposing":
      return "Repurposing plan";
    case "Training/L&D":
      return "10-min call";
    case "Overflow capacity":
      return "10-min call";
  }
}

function generateHook(
  fields: ExtractedFields,
  angle: OutreachAngle,
  tier: Tier
): string {
  const name = fields.name || "there";
  const company = fields.company ? ` at ${fields.company}` : "";

  // Generate deterministic hooks that emphasize differentiators
  const hooks: Record<OutreachAngle, string> = {
    Speed: `Hi ${name} – I help teams ship video edits in 3–4 hours when timelines get tight. Would a free 60-second audit of one of your clips show you what that speed looks like?`,
    Accessibility: `Hi ${name} – every video I deliver comes with captions, readable fonts, and sound-off optimization as standard. Interested in a free accessibility audit of a recent asset?`,
    Repurposing: `Hi ${name} – I turn one long-form piece into 5+ accessibility-ready shorts in under a day. Could I map out a quick repurposing plan for you?`,
    "Overflow capacity": `Hi ${name} – when your team${company} hits a video crunch, I offer 3–4 hour turnaround with accessibility baked in. Open to a quick 10-minute call about overflow capacity?`,
    "Training/L&D": `Hi ${name} – I produce learning videos with built-in captions and readable design, shipped fast. Could a 10-minute call explore how that supports your training programs?`,
  };

  let hook = hooks[angle];
  // Ensure ≤300 chars
  if (hook.length > 300) hook = hook.slice(0, 297) + "...";
  return hook;
}

function generateCTA(angle: OutreachAngle, step: OnboardingStep): string {
  const ctas: Record<OnboardingStep, string> = {
    "Pilot clip":
      "Send me one raw clip and I'll turn around an edited sample within 4 hours – no charge, no strings.",
    "60-sec audit":
      "Drop me a link to any existing video and I'll send back a 60-second accessibility audit – totally free.",
    "Repurposing plan":
      "Share one long-form piece and I'll map out a repurposing plan with 5+ deliverables – on the house.",
    "10-min call":
      "Would a quick 10-minute call this week work? Happy to share how I plug into teams like yours.",
  };

  let cta = ctas[step];
  if (cta.length > 180) cta = cta.slice(0, 177) + "...";
  return cta;
}

// ── Public API ─────────────────────────────────────────────

export function buildOutreachReco(
  fields: ExtractedFields,
  signals: SignalMatch[],
  score: number,
  tier: Tier
): OutreachReco {
  const method = pickContactMethod(fields, signals);
  const angle = pickAngle(signals);
  const step = pickOnboardingStep(angle);
  const hook = generateHook(fields, angle, tier);
  const cta = generateCTA(angle, step);

  return {
    suggested_contact_method: method,
    suggested_angle: angle,
    outreach_hook: hook,
    call_to_action: cta,
    onboarding_next_step: step,
  };
}
