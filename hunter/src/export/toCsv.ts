/* ──────────────────────────────────────────────────────────
   Hunter – Export to CSV
   ────────────────────────────────────────────────────────── */

import fs from "fs";
import path from "path";
import { LeadCandidate } from "../types";
import { Logger } from "../utils/logger";

export function exportToCsv(
  candidates: LeadCandidate[],
  outDir: string,
  logger: Logger
): string {
  try {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const filename = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    const filePath = path.join(outDir, filename);

    // CSV header
    const headers = [
      "company_name",
      "domain",
      "company_url",
      "score",
      "tier",
      "country_guess",
      "remote_signal",
      "us_review_required",
      "emails",
      "contact_page_url",
      "careers_page_url",
      "demo_booking_url",
      "recommended_contact_method",
      "suggested_outreach_angle",
      "video_keywords",
      "location_keywords",
      "confidence",
    ];

    // Rows
    const rows = candidates.map((c) => [
      c.company_name,
      c.domain,
      c.company_url,
      c.score,
      c.tier,
      c.country_guess,
      c.remote_signal,
      c.us_review_required ? "yes" : "no",
      c.emails.join("; "),
      c.contact_page_url || "",
      c.careers_page_url || "",
      c.demo_booking_url || "",
      c.recommended_contact_method,
      c.suggested_outreach_angle,
      c.video_keywords.join("; "),
      c.location_keywords.join("; "),
      c.confidence,
    ]);

    // Build CSV
    const csvLines = [headers.map((h) => `"${h}"`).join(",")];
    rows.forEach((row) => {
      csvLines.push(
        row
          .map((cell) => {
            const str = String(cell || "");
            // Escape quotes in cell content
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(",")
      );
    });

    fs.writeFileSync(filePath, csvLines.join("\n"));

    logger.log("ExportCsv", `✓ Exported to ${filePath}`);
    return filePath;
  } catch (error: any) {
    logger.error("ExportCsv", `Failed to export: ${error.message}`);
    throw error;
  }
}
