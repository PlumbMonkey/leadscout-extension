/* ──────────────────────────────────────────────────────────
   Hunter – HTTP Client with rate limiting
   ────────────────────────────────────────────────────────── */

import fetch from "node-fetch";
import { Logger } from "../utils/logger";

export interface HttpClientConfig {
  rate_limit_ms: number;
  timeout_ms: number;
  user_agent: string;
}

export class HttpClient {
  private config: HttpClientConfig;
  private logger: Logger;
  private lastRequestTime: number = 0;

  constructor(config: HttpClientConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async fetch(url: string, retries: number = 3): Promise<string | null> {
    // Rate limiting: wait if needed
    const now = Date.now();
    const timeToWait = Math.max(0, this.config.rate_limit_ms - (now - this.lastRequestTime));
    if (timeToWait > 0) {
      await this.sleep(timeToWait);
    }
    this.lastRequestTime = Date.now();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          timeout: this.config.timeout_ms,
          headers: {
            "User-Agent": this.config.user_agent,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        if (!response.ok) {
          this.logger.debug_log("HttpClient", `Status ${response.status} for ${url}`);
          return null;
        }

        return await response.text();
      } catch (error: any) {
        this.logger.debug_log(
          "HttpClient",
          `Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`
        );

        if (attempt < retries) {
          await this.sleep(1000 * attempt);
        } else {
          this.logger.warn("HttpClient", `Failed to fetch ${url} after ${retries} attempts`);
          return null;
        }
      }
    }

    return null;
  }

  async post(url: string, body: any, headers?: Record<string, string>): Promise<string | null> {
    // Rate limiting: wait if needed
    const now = Date.now();
    const timeToWait = Math.max(0, this.config.rate_limit_ms - (now - this.lastRequestTime));
    if (timeToWait > 0) {
      await this.sleep(timeToWait);
    }
    this.lastRequestTime = Date.now();

    try {
      const response = await fetch(url, {
        method: "POST",
        timeout: this.config.timeout_ms,
        headers: {
          "User-Agent": this.config.user_agent,
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        this.logger.debug_log("HttpClient", `POST ${response.status} for ${url}`);
        return null;
      }

      return await response.text();
    } catch (error: any) {
      this.logger.warn("HttpClient", `POST failed for ${url}: ${error.message}`);
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
