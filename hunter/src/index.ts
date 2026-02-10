/* ──────────────────────────────────────────────────────────
   Hunter – Main CLI Entry Point
   ────────────────────────────────────────────────────────── */

import fs from "fs";
import path from "path";
import { HunterConfig, LeadCandidate } from "./types";
import { loadConfig, parseCliArgs } from "./config";
import { Logger } from "./utils/logger";
import { isDeniedDomain, isValidUrl, normalizeUrl } from "./utils/urls";
import { extractDomain } from "./utils/strings";
import { HttpClient } from "./fetch/httpClient";
import { RobotsChecker } from "./fetch/robots";
import { extractContent } from "./parse/extract";
import { extractSignals } from "./parse/signals";
import { normalizeUrl as normalizeUrlParse, inferCompanyName, countryGuess, remoteSignal } from "./parse/normalize";
import { scoreCandidate, rankCandidates } from "./score/score";
import { ManualUrlsProvider } from "./providers/manualUrls";
import { ManualQueriesProvider } from "./providers/manualQueries";
import { PondFinder, PondConfig } from "./providers/pondFinder";
import { exportToJson } from "./export/toJson";
import { exportToCsv } from "./export/toCsv";
import { scoreWithServer, appendLeadToServer } from "./export/toServer";

async function main() {
  try {
    // Parse CLI args and load config
    const cliArgs = parseCliArgs();
    const config: HunterConfig = loadConfig(cliArgs);

    const logger = new Logger({ debug: config.debug });

    logger.log("HUNTER", "🔍 LeadScout Hunter – Off-LinkedIn Lead Discovery");
    logger.log("HUNTER", `Started at ${new Date().toISOString()}`);

    // Load deny list
    const denyDomainsPath = config.deny_domains || "hunter/data/deny.domains.txt";
    let denyDomains: string[] = [];
    if (fs.existsSync(denyDomainsPath)) {
      denyDomains = fs
        .readFileSync(denyDomainsPath, "utf-8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
    }

    // Initialize HTTP client early (needed for PondFinder)
    const httpClient = new HttpClient(
      {
        rate_limit_ms: config.rate_limit_ms,
        timeout_ms: config.timeout_ms,
        user_agent: config.user_agent,
      },
      logger
    );

    // PondFinder: Refresh seeds if requested
    if (config.refresh_seeds) {
      logger.log("HUNTER", "\n🎣 PondFinder: Refreshing fishing pond seeds...");

      // Load ponds config
      let pondsConfig: PondConfig | null = null;
      if (config.ponds_config && fs.existsSync(config.ponds_config)) {
        const content = fs.readFileSync(config.ponds_config, "utf-8");
        pondsConfig = JSON.parse(content);
      } else {
        logger.warn("HUNTER", `Ponds config not found: ${config.ponds_config}`);
      }

      if (pondsConfig) {
        const denySet = new Set(denyDomains);
        const serperApiKey = process.env.SERPER_API_KEY;
        const pondFinder = new PondFinder(pondsConfig, denySet, httpClient, logger, serperApiKey);

        let pondResult;
        if (config.pond_mode === "serper") {
          pondResult = await pondFinder.discoverSerper();
        } else {
          const seedDomainsPath = path.join(path.dirname(config.ponds_config || ""), "seeds.domains.txt");
          pondResult = await pondFinder.discoverManual(seedDomainsPath);
        }

        // Write discovered URLs to seeds.urls.txt
        const outputPath = path.join(path.dirname(config.ponds_config || ""), "seeds.urls.txt");
        await pondFinder.writeUrls(pondResult, outputPath);

        logger.log("HUNTER", `  ✓ Discovered ${pondResult.count} URLs (${pondResult.filtered_count} filtered)`);
        logger.log("HUNTER", `  ✓ Wrote URLs to ${outputPath}`);
      }
    }

    // Get URLs from providers
    const urlsProvider = new ManualUrlsProvider(config.seeds_urls || "hunter/data/seeds.urls.txt");
    const queriesProvider = new ManualQueriesProvider(config.seeds_queries || "hunter/data/seeds.queries.txt");

    let urls = await urlsProvider.getUrls();

    if (urls.length === 0) {
      // Try queries provider
      logger.log("HUNTER", "No URLs found in seeds.urls.txt, checking seeds.queries.txt...");
      const queryUrls = await queriesProvider.getUrls();
      urls = queryUrls;
    }

    if (urls.length === 0) {
      logger.warn("HUNTER", "No URLs to process. Please add URLs to hunter/data/seeds.urls.txt");
      return;
    }

    logger.log("HUNTER", `Found ${urls.length} URLs to process`);

    const robotsChecker = new RobotsChecker(httpClient, logger);

    // Process URLs
    const candidates: LeadCandidate[] = [];
    const processedDomains = new Set<string>();
    let processed = 0;
    let serverAppended = 0;

    for (const url of urls.slice(0, config.max_pages)) {
      if (!isValidUrl(url)) {
        logger.debug_log("HUNTER", `Skipping invalid URL: ${url}`);
        continue;
      }

      const normalizedUrl = normalizeUrl(url);
      const domain = extractDomain(normalizedUrl);

      // Skip if already processed (dedupe)
      if (processedDomains.has(domain)) {
        logger.debug_log("HUNTER", `Skipping duplicate domain: ${domain}`);
        continue;
      }
      processedDomains.add(domain);

      // Check deny list (LinkedIn, Facebook, etc.)
      if (isDeniedDomain(domain, denyDomains)) {
        logger.log(
          "HUNTER",
          `❌ BLOCKED [${processed + 1}/${urls.length}] ${normalizedUrl} (denied domain: ${domain})`
        );
        processed++;
        continue;
      }

      // Check robots
      const canFetch = await robotsChecker.canFetch(normalizedUrl);
      if (!canFetch) {
        logger.debug_log("HUNTER", `Skipping URL (robots.txt): ${normalizedUrl}`);
        continue;
      }

      logger.log(
        "HUNTER",
        `🔄 FETCH [${processed + 1}/${urls.length}] ${normalizedUrl}`
      );

      // Fetch HTML
      const html = await httpClient.fetch(normalizedUrl);
      if (!html) {
        logger.log("HUNTER", `  ⚠️ Failed to fetch HTML`);
        processed++;
        continue;
      }

      // Extract content
      const content = extractContent(html);

      // Extract signals
      const signals = extractSignals(content.text, content.links, normalizedUrl);

      // Infer company details
      const company_name = inferCompanyName(normalizedUrl, content.title);
      const country = countryGuess(content.text + " " + content.title, domain);
      const remote = remoteSignal(content.text);

      // Create candidate (without scoring initially)
      const candidate: Omit<
        LeadCandidate,
        "score" | "tier" | "confidence" | "recommended_contact_method" | "suggested_outreach_angle"
      > = {
        domain,
        company_name,
        company_url: normalizedUrl,
        emails: signals.emails,
        contact_page_url: signals.contact_page_url,
        careers_page_url: signals.careers_page_url,
        demo_booking_url: signals.demo_booking_url,
        social_links: signals.social_links,
        video_keywords: signals.video_keywords,
        location_keywords: signals.location_keywords,
        country_guess: country,
        remote_signal: remote,
        us_review_required: country === "US" && !config.include_us,
        raw_html_sample: content.text.slice(0, 2000),
        source_url: normalizedUrl,
        discovered_at: new Date().toISOString(),
        source_mode: config.refresh_seeds ? "serper" : "manual", // Updated by PondFinder if applicable
        source_query: "manual_urls", // Will be updated by PondFinder
        discovery_confidence: 75, // Base confidence, can be adjusted by scoring
      };

      // Score candidate
      let fullCandidate: LeadCandidate;

      if (config.use_server) {
        // Score using LeadScout server
        const serverScoring = await scoreWithServer(candidate, config.server_url, logger);

        if (serverScoring.error) {
          logger.log(
            "HUNTER",
            `  ⚠️ Server scoring failed: ${serverScoring.error}`
          );
          processed++;
          continue;
        }

        fullCandidate = {
          ...candidate,
          score: serverScoring.score,
          tier: serverScoring.tier,
          confidence: 85,
          discovery_confidence: 80,
          recommended_contact_method: serverScoring.outreachReco.suggested_contact_method as any,
          suggested_outreach_angle: serverScoring.outreachReco.suggested_angle as any,
        };
      } else {
        // Score locally
        const scoring = scoreCandidate(candidate);
        fullCandidate = {
          ...candidate,
          ...scoring,
          discovery_confidence: 70, // Local scoring slightly lower discovery confidence
        };
      }

      // Filter by tier
      const shouldCaptureToSheets = shouldCapture(fullCandidate, config);
      const skipReason = getSkipReason(fullCandidate, config);

      if (skipReason) {
        logger.log(
          "HUNTER",
          `  ⏭️  SKIP [${fullCandidate.tier}/${fullCandidate.score}] ${skipReason}`
        );
        processed++;
        continue;
      }

      // Filter by remote
      if (config.remote_only && fullCandidate.remote_signal === "NO") {
        logger.log(
          "HUNTER",
          `  ⏭️  SKIP [${fullCandidate.tier}/${fullCandidate.score}] Remote only enabled, candidate is not remote`
        );
        processed++;
        continue;
      }

      // Log candidate found
      logger.log(
        "HUNTER",
        `  ✅ FOUND [${fullCandidate.tier}/${fullCandidate.score}] ${fullCandidate.company_name} (${fullCandidate.country_guess})`
      );

      candidates.push(fullCandidate);

      // If server mode and tier matches, append to Google Sheets
      if (config.use_server && shouldCaptureToSheets) {
        const appended = await appendLeadToServer(fullCandidate, config.server_url, logger);
        if (appended) {
          serverAppended++;
        }
      }

      processed++;
    }

    logger.log(
      "HUNTER",
      `\n✓ Processed ${processed} URLs, found ${candidates.length} qualified candidates`
    );
    if (config.use_server && serverAppended > 0) {
      logger.log("HUNTER", `✓ Appended ${serverAppended} leads to Google Sheets via server`);
    }

    // If not in server mode, export to files
    if (!config.use_server || config.export_to.includes("json") || config.export_to.includes("csv")) {
      // Rank candidates
      const ranked = rankCandidates(candidates);

      // Export results
      const outDir = config.out_dir || "hunter/out";

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      let exportPaths: string[] = [];

      if (config.export_to.includes("json")) {
        const jsonPath = exportToJson(ranked, outDir, logger);
        exportPaths.push(jsonPath);
      }

      if (config.export_to.includes("csv")) {
        const csvPath = exportToCsv(ranked, outDir, logger);
        exportPaths.push(csvPath);
      }

      // Summary
      logger.log("HUNTER", "\n=== SUMMARY ===");
      logger.log("HUNTER", `Total candidates: ${ranked.length}`);
      logger.log(
        "HUNTER",
        `Tier A: ${ranked.filter((c) => c.tier === "A").length}, Tier B: ${ranked.filter((c) => c.tier === "B").length}, Tier C: ${ranked.filter((c) => c.tier === "C").length}`
      );

      if (exportPaths.length > 0) {
        logger.log("HUNTER", `\nExports:`);
        exportPaths.forEach((p) => logger.log("HUNTER", `  ${p}`));
      }
    } else {
      // Server mode summary
      logger.log("HUNTER", "\n=== SUMMARY ===");
      logger.log("HUNTER", `Total candidates: ${candidates.length}`);
      logger.log(
        "HUNTER",
        `Tier A: ${candidates.filter((c) => c.tier === "A").length}, Tier B: ${candidates.filter((c) => c.tier === "B").length}, Tier C: ${candidates.filter((c) => c.tier === "C").length}`
      );
      logger.log("HUNTER", `Appended to Google Sheets: ${serverAppended}`);
    }

    logger.log("HUNTER", "\n✓ Hunter complete!");
    if (config.use_server) {
      logger.log("HUNTER", "Results saved to Google Sheets. View in LeadScout dashboard.");
    } else {
      logger.log("HUNTER", "Next steps: review results in hunter/out/, manually outreach to top prospects");
    }
  } catch (error: any) {
    console.error("FATAL:", error.message);
    process.exit(1);
  }
}

/**
 * Should this candidate be captured to Google Sheets?
 */
function shouldCapture(candidate: LeadCandidate, config: HunterConfig): boolean {
  // Check tier filter
  if (config.tier_filter === "AB") {
    if (candidate.tier !== "A" && candidate.tier !== "B") {
      return false;
    }
  } else if (config.tier_filter === "ABC") {
    if (candidate.tier === "SKIP") {
      return false;
    }
  }

  // Check US review requirement
  if (candidate.us_review_required && !config.allow_us_capture) {
    return false;
  }

  return true;
}

/**
 * Get a human-readable skip reason if candidate should be filtered out
 */
function getSkipReason(candidate: LeadCandidate, config: HunterConfig): string | null {
  if (config.tier_filter === "AB" && candidate.tier !== "A" && candidate.tier !== "B") {
    return `Tier ${candidate.tier} (need A or B)`;
  }

  if (candidate.us_review_required && !config.allow_us_capture) {
    return "US candidate (allowUSCapture not set)";
  }

  if (candidate.tier === "SKIP") {
    return "Very low score";
  }

  return null;
}
main();