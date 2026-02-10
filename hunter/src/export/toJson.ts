/* ──────────────────────────────────────────────────────────
   Hunter – Export to JSON
   ────────────────────────────────────────────────────────── */

import fs from "fs";
import path from "path";
import { LeadCandidate } from "../types";
import { Logger } from "../utils/logger";

export function exportToJson(
  candidates: LeadCandidate[],
  outDir: string,
  logger: Logger
): string {
  try {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const filename = `leads-${new Date().toISOString().split("T")[0]}.json`;
    const filePath = path.join(outDir, filename);

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          metadata: {
            exported_at: new Date().toISOString(),
            total_candidates: candidates.length,
            tiers: {
              A: candidates.filter((c) => c.tier === "A").length,
              B: candidates.filter((c) => c.tier === "B").length,
              C: candidates.filter((c) => c.tier === "C").length,
              SKIP: candidates.filter((c) => c.tier === "SKIP").length,
            },
          },
          candidates,
        },
        null,
        2
      )
    );

    logger.log("ExportJson", `✓ Exported to ${filePath}`);
    return filePath;
  } catch (error: any) {
    logger.error("ExportJson", `Failed to export: ${error.message}`);
    throw error;
  }
}
