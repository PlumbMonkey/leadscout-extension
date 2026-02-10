/* ──────────────────────────────────────────────────────────
   Hunter – Manual URLs Provider
   ────────────────────────────────────────────────────────── */

import fs from "fs";
import { Provider } from "./provider";

export class ManualUrlsProvider implements Provider {
  name = "manual-urls";
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
      return content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && line.startsWith("http"));
    } catch (error) {
      console.error(`Failed to read URLs from ${this.filePath}`);
      return [];
    }
  }
}
