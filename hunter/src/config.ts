/* ──────────────────────────────────────────────────────────
   Hunter – Configuration Loader
   ────────────────────────────────────────────────────────── */

import fs from "fs";
import path from "path";
import { HunterConfig } from "./types";

// Paths are relative to the hunter directory
const DEFAULTS_FILE = path.join(__dirname, "../config/defaults.json");
const DEFAULT_URLS_FILE = path.join(__dirname, "../data/seeds.urls.txt");
const DEFAULT_QUERIES_FILE = path.join(__dirname, "../data/seeds.queries.txt");
const DEFAULT_DENY_FILE = path.join(__dirname, "../data/deny.domains.txt");
const DEFAULT_OUT_DIR = path.join(__dirname, "../out");
const DEFAULT_PONDS_FILE = path.join(__dirname, "../data/seeds.ponds.json");
const DEFAULT_DOMAINS_FILE = path.join(__dirname, "../data/seeds.domains.txt");

export function loadConfig(cliArgs: Record<string, any>): HunterConfig {
  // Load defaults
  let defaults: Partial<HunterConfig> = {};
  if (fs.existsSync(DEFAULTS_FILE)) {
    const content = fs.readFileSync(DEFAULTS_FILE, "utf-8");
    defaults = JSON.parse(content);
  }

  // Parse export_to flag
  let export_to: ("json" | "csv" | "server")[] = ["json", "csv"];
  if (cliArgs.to) {
    // --to=csv,json,server or --to=server
    export_to = cliArgs.to.split(",").map((s: string) => s.trim()) as ("json" | "csv" | "server")[];
  }

  // Merge with CLI args
  const config: HunterConfig = {
    rate_limit_ms: cliArgs.rate_limit_ms ?? defaults.rate_limit_ms ?? 800,
    max_pages: cliArgs.max_pages ?? defaults.max_pages ?? 50,
    timeout_ms: cliArgs.timeout_ms ?? defaults.timeout_ms ?? 15000,
    user_agent: defaults.user_agent || "Mozilla/5.0 (compatible; HunterBot/1.0)",
    remote_only: cliArgs.remote_only ?? defaults.remote_only ?? false,
    prefer_canada: cliArgs.prefer_canada ?? defaults.prefer_canada ?? true,
    include_us: cliArgs.include_us ?? defaults.include_us ?? false,
    debug: cliArgs.debug ?? defaults.debug ?? false,
    seeds_urls: cliArgs.urls || DEFAULT_URLS_FILE,
    seeds_queries: cliArgs.seeds || DEFAULT_QUERIES_FILE,
    deny_domains: cliArgs.deny_domains || DEFAULT_DENY_FILE,
    out_dir: cliArgs.out || DEFAULT_OUT_DIR,
    // Server integration
    use_server: export_to.includes("server") && cliArgs.server !== "false",
    server_url: cliArgs.serverUrl || cliArgs.server_url || "http://localhost:3789",
    tier_filter: cliArgs.tier || "AB",
    allow_us_capture: cliArgs.allowUSCapture === "true" || cliArgs.allow_us_capture === true,
    export_to,
    // PondFinder
    refresh_seeds: cliArgs.refreshSeeds === true || cliArgs.refreshSeeds === "true" || cliArgs.refresh_seeds === true,
    pond_mode: cliArgs.pondMode || cliArgs.pond_mode || "manual",
    ponds_config: cliArgs.pondsConfig || cliArgs.ponds_config || DEFAULT_PONDS_FILE,
  };

  return config;
}

export function parseCliArgs(): Record<string, any> {
  const args: Record<string, any> = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      args[key] = value === "true" ? true : value === "false" ? false : value;
    }
  });
  return args;
}
