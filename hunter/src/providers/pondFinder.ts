/* ──────────────────────────────────────────────────────────
   Hunter – PondFinder Provider
   Discovers and refreshes "fishing pond" URLs (seed URLs) from
   public web sources without scraping LinkedIn or denied domains.
   ────────────────────────────────────────────────────────── */

import * as fs from "fs";
import * as path from "path";
import { Logger } from "../utils/logger";
import { HttpClient } from "../fetch/httpClient";

export interface PondConfig {
  queries: string[];
  required_terms: string[];
  canada_boost_terms: string[];
  url_patterns: string[];
  max_results_per_query: number;
  allow_us: boolean;
  output_mode: "urls_file" | "direct";
  output_file: string;
}

export interface PondFinderResult {
  urls: string[];
  mode: "manual" | "serper";
  count: number;
  filtered_count: number;
  discovered_at: string;
}

export class PondFinder {
  private logger: Logger;
  private httpClient: HttpClient;
  private config: PondConfig;
  private denyDomains: Set<string>;
  private serperApiKey?: string;

  constructor(
    config: PondConfig,
    denyDomains: Set<string>,
    httpClient: HttpClient,
    logger: Logger,
    serperApiKey?: string
  ) {
    this.config = config;
    this.denyDomains = denyDomains;
    this.httpClient = httpClient;
    this.logger = logger;
    this.serperApiKey = serperApiKey;
  }

  /**
   * Manual expansion mode: reads seeds.domains.txt and applies url patterns
   */
  async discoverManual(seedDomainsPath: string): Promise<PondFinderResult> {
    this.logger.log("PondFinder", "Manual mode: expanding seed domains...");

    const urls: string[] = [];
    const seen = new Set<string>();

    // Read seed domains
    let domains: string[] = [];
    if (fs.existsSync(seedDomainsPath)) {
      const content = fs.readFileSync(seedDomainsPath, "utf-8");
      domains = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
      this.logger.log(
        "PondFinder",
        `Found ${domains.length} seed domains from ${seedDomainsPath}`
      );
    } else {
      this.logger.warn(
        "PondFinder",
        `Seeds file not found: ${seedDomainsPath}`
      );
      return {
        urls: [],
        mode: "manual",
        count: 0,
        filtered_count: 0,
        discovered_at: new Date().toISOString(),
      };
    }

    // For each domain, generate candidate URLs by applying patterns
    for (const domain of domains) {
      // Skip if in deny list
      if (this.isDenied(domain)) {
        this.logger.log(
          "PondFinder",
          `⊘ Skipped ${domain} (denied domain)`
        );
        continue;
      }

      // Generate URLs for this domain
      const base = `https://${domain}`;
      for (const pattern of this.config.url_patterns) {
        const url = base + pattern;
        if (!seen.has(url)) {
          urls.push(url);
          seen.add(url);
        }
      }
    }

    this.logger.log(
      "PondFinder",
      `Generated ${urls.length} candidate URLs`
    );

    return {
      urls,
      mode: "manual",
      count: urls.length,
      filtered_count: this.denyDomains.size,
      discovered_at: new Date().toISOString(),
    };
  }

  /**
   * Serper API mode: search for relevant companies and generate URLs
   * Requires SERPER_API_KEY environment variable
   */
  async discoverSerper(): Promise<PondFinderResult> {
    if (!this.serperApiKey) {
      this.logger.warn(
        "PondFinder",
        "Serper mode requested but SERPER_API_KEY not set. Skipping."
      );
      return {
        urls: [],
        mode: "serper",
        count: 0,
        filtered_count: 0,
        discovered_at: new Date().toISOString(),
      };
    }

    this.logger.log("PondFinder", "Serper mode: querying for relevant companies...");

    const urls: string[] = [];
    const seen = new Set<string>();
    let filtered = 0;

    for (const query of this.config.queries.slice(0, 3)) {
      // Limit to 3 queries to avoid rate limits
      try {
        const results = await this.querySerper(query);
        for (const result of results.slice(0, this.config.max_results_per_query)) {
          // Extract domain from URL
          const urlObj = new URL(result);
          const domain = urlObj.hostname;

          if (this.isDenied(domain)) {
            filtered++;
            continue;
          }

          // Add base domain
          const base = `https://${domain}`;
          if (!seen.has(base)) {
            urls.push(base);
            seen.add(base);
          }

          // Add pattern URLs
          for (const pattern of this.config.url_patterns) {
            const patternUrl = base + pattern;
            if (!seen.has(patternUrl)) {
              urls.push(patternUrl);
              seen.add(patternUrl);
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(
          "PondFinder",
          `Error querying Serper for "${query}": ${err.message}`
        );
      }
    }

    this.logger.log(
      "PondFinder",
      `Discovered ${urls.length} URLs via Serper (${filtered} filtered)`
    );

    return {
      urls,
      mode: "serper",
      count: urls.length,
      filtered_count: filtered,
      discovered_at: new Date().toISOString(),
    };
  }

  /**
   * Query Serper API and extract result URLs
   */
  private async querySerper(query: string): Promise<string[]> {
    const body = {
      q: query,
      num: 20,
    };

    const response = await this.httpClient.post(
      "https://google.serper.dev/search",
      body,
      {
        "X-API-KEY": this.serperApiKey!,
        "Content-Type": "application/json",
      }
    );

    if (!response) {
      return [];
    }

    const data = JSON.parse(response);
    const urls: string[] = [];

    // Extract from organic results
    if (data.organic) {
      for (const result of data.organic) {
        if (result.link) {
          urls.push(result.link);
        }
      }
    }

    return urls;
  }

  /**
   * Write discovered URLs to output file
   */
  async writeUrls(result: PondFinderResult, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = result.urls.join("\n");
    fs.writeFileSync(outputPath, content, "utf-8");

    this.logger.log(
      "PondFinder",
      `Wrote ${result.urls.length} URLs to ${outputPath}`
    );
  }

  /**
   * Check if domain is in deny list
   */
  private isDenied(domain: string): boolean {
    // Normalize domain
    const normalized = domain.toLowerCase();
    return this.denyDomains.has(normalized);
  }
}
