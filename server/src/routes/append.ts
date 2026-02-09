/* ──────────────────────────────────────────────────────────
   LeadScout Server – /append-lead route
   ────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express";
import { AppendLeadRequest, AppendLeadResponse } from "@leadscout/shared";
import { appendLeadRow, ensureHeaders } from "../services/sheets";
import { isDuplicate, recordCapture } from "../services/dedupe";

const router = Router();

let headerChecked = false;

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as AppendLeadRequest;

    if (!body.lead) {
      res.status(400).json({ success: false, message: "Missing lead object" });
      return;
    }

    const lead = body.lead;

    // Dedupe check
    if (isDuplicate(lead.page_url)) {
      const resp: AppendLeadResponse = {
        success: false,
        message: "Already captured recently (within 7 days).",
        duplicate: true,
      };
      res.status(409).json(resp);
      return;
    }

    // Ensure header row on first write
    if (!headerChecked) {
      await ensureHeaders();
      headerChecked = true;
    }

    // Write row
    await appendLeadRow(lead);

    // Record for dedupe
    recordCapture(lead.page_url);

    const resp: AppendLeadResponse = {
      success: true,
      message: "Lead captured and appended to Google Sheets.",
    };
    res.json(resp);
  } catch (err: any) {
    console.error("Append-lead error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to write to Google Sheets.",
    });
  }
});

export default router;
