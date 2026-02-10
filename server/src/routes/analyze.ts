/* ──────────────────────────────────────────────────────────
   LeadScout Server – /analyze route
   ────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express";
import {
  AnalyzeRequest,
  AnalyzeResponse,
  detectSignals,
  computeScore,
  buildOutreachReco,
} from "@leadscout/shared";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  try {
    const body = req.body as any;

    // Normalize payload: support both extension shape and Hunter shape
    const normalized_payload = normalizeAnalyzePayload(body);
    if (!normalized_payload) {
      res.status(400).json({
        error: "Missing required fields. Accepted payload shapes: " +
          "(1) {page_url, extracted_fields} or " +
          "(2) {url, text?, links?, emails?}",
      });
      return;
    }

    const { page_url, extracted_fields, raw_text_sample, signals } = normalized_payload;

    // Merge signals from content script + re-detect from raw text
    const serverSignals = detectSignals(raw_text_sample || "");
    const allSignals = mergeSignals(signals || [], serverSignals);

    // Also detect from extracted field values
    const fieldText = [
      extracted_fields.name,
      extracted_fields.title,
      extracted_fields.company,
      extracted_fields.location,
    ].join(" ");
    const fieldSignals = detectSignals(fieldText);
    const finalSignals = mergeSignals(allSignals, fieldSignals);

    // Normalize
    const normalized = {
      name: clean(extracted_fields.name),
      title: clean(extracted_fields.title),
      company: clean(extracted_fields.company),
      location: clean(extracted_fields.location),
      page_url: page_url,
    };

    // Score
    const { score, tier, evidence } = computeScore(finalSignals, normalized);

    // Outreach
    const outreach_reco = buildOutreachReco(normalized, finalSignals, score, tier);

    const result: AnalyzeResponse = {
      normalized_lead: normalized,
      score,
      tier,
      evidence,
      outreach_reco,
    };

    res.json(result);
  } catch (err: any) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ── helpers ────────────────────────────────────────────────

function clean(s: string | undefined): string {
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}

import { SignalMatch } from "@leadscout/shared";

function mergeSignals(a: SignalMatch[], b: SignalMatch[]): SignalMatch[] {
  const map = new Map<string, Set<string>>();
  for (const list of [a, b]) {
    for (const sig of list) {
      const existing = map.get(sig.category) ?? new Set();
      sig.matched.forEach((m) => existing.add(m));
      map.set(sig.category, existing);
    }
  }
  const merged: SignalMatch[] = [];
  map.forEach((matched, category) => {
    merged.push({ category: category as SignalMatch["category"], matched: [...matched] });
  });
  return merged;
}

/**
 * Normalize payload from both extension and Hunter sources.
 * 
 * Extension shape: { page_url, extracted_fields: { name?, title?, company?, location?, ... }, signals?, raw_text_sample? }
 * Hunter shape:   { url, text?, links?, emails? }
 * 
 * Returns normalized: { page_url, extracted_fields, signals?, raw_text_sample? }
 * Or null if required fields are missing.
 */
function normalizeAnalyzePayload(body: any): any {
  // Extract page_url: prefer page_url, fallback to url
  const page_url = body.page_url || body.url;
  if (!page_url) {
    return null;
  }

  // Extract extracted_fields: prefer existing extracted_fields, else construct from Hunter shape
  let extracted_fields = body.extracted_fields;
  if (!extracted_fields) {
    // Hunter shape: construct extracted_fields from { text, links, emails }
    extracted_fields = {
      name: "", // Hunter doesn't provide name directly
      title: "", // Hunter doesn't provide title directly
      company: "", // Hunter doesn't provide company directly
      location: "", // Hunter doesn't provide location directly
      text: body.text || "", // Raw text content for signal detection
    };
  }

  // Preserve optional fields
  const raw_text_sample = body.raw_text_sample || body.text || "";
  const signals = body.signals || [];

  return {
    page_url,
    extracted_fields,
    raw_text_sample,
    signals,
  };
}

export default router;
