/* ──────────────────────────────────────────────────────────
   Hunter – Serper Provider Stub
   ────────────────────────────────────────────────────────── */

import { Provider } from "./provider";

/**
 * SerperProvider stub – ready to integrate with Serper API.
 * To use: set SERPER_API_KEY environment variable
 */
export class SerperProvider implements Provider {
  name = "serper";
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY;
  }

  async getUrls(): Promise<string[]> {
    console.log(
      "\n[SerperProvider] To use Serper for web search:"
    );
    console.log("  1. Get a free API key from https://serper.dev");
    console.log("  2. Set SERPER_API_KEY=your_key in .env");
    console.log("  3. Implement the search query logic\n");

    return [];
  }
}
