/* ──────────────────────────────────────────────────────────
   Hunter – Robots.txt Checker (best effort MVP)
   ────────────────────────────────────────────────────────── */

import { HttpClient } from "./httpClient";
import { Logger } from "../utils/logger";

export class RobotsChecker {
  private httpClient: HttpClient;
  private logger: Logger;
  private cache: Map<string, boolean> = new Map();

  constructor(httpClient: HttpClient, logger: Logger) {
    this.httpClient = httpClient;
    this.logger = logger;
  }

  async canFetch(url: string): Promise<boolean> {
    try {
      const domain = new URL(url).hostname;
      const cacheKey = domain;

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey) ?? true;
      }

      // For MVP, we assume we can fetch unless explicitly denied
      // A proper implementation would parse robots.txt
      const allowed = true;
      this.cache.set(cacheKey, allowed);
      return allowed;
    } catch {
      return true; // If we can't determine, allow it
    }
  }
}
