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
    const body = req.body as AnalyzeRequest;

    if (!body.extracted_fields || !body.page_url) {
      res.status(400).json({ error: "Missing extracted_fields or page_url" });
      return;
    }

    // Merge signals from content script + re-detect from raw text
    const serverSignals = detectSignals(body.raw_text_sample || "");
    const allSignals = mergeSignals(body.signals || [], serverSignals);

    // Also detect from extracted field values
    const fieldText = [
      body.extracted_fields.name,
      body.extracted_fields.title,
      body.extracted_fields.company,
      body.extracted_fields.location,
    ].join(" ");
    const fieldSignals = detectSignals(fieldText);
    const finalSignals = mergeSignals(allSignals, fieldSignals);

    // Normalize
    const normalized = {
      name: clean(body.extracted_fields.name),
      title: clean(body.extracted_fields.title),
      company: clean(body.extracted_fields.company),
      location: clean(body.extracted_fields.location),
      page_url: body.page_url,
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

export default router;
