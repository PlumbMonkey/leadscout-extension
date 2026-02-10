/* ──────────────────────────────────────────────────────────
   Hunter – Manual Queries Provider (stub for MVP)
   ────────────────────────────────────────────────────────── */

import fs from "fs";
import { Provider } from "./provider";

export class ManualQueriesProvider implements Provider {
  name = "manual-queries";
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async getUrls(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }

      const content = fs.readFileSync(this.filePath, "utf-8");
      const queries = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      console.log(
        "\n[ManualQueriesProvider] For MVP, query-based discovery is not implemented."
      );
      console.log(
        "To use these queries, please integrate a search provider (e.g., Serper API)."
      );
      console.log(`Found ${queries.length} queries in ${this.filePath}:\n`);
      queries.forEach((q) => console.log(`  - ${q}`));
      console.log(
        "\nFor now, please add search result URLs to hunter/data/seeds.urls.txt\n"
      );

      return [];
    } catch (error) {
      console.error(`Failed to read queries from ${this.filePath}`);
      return [];
    }
  }
}
