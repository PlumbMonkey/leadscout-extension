# Hunter – Off-LinkedIn Lead Discovery for LeadScout

Hunter is a CLI tool that discovers leads **off LinkedIn** by scraping public company sites, directories, and job boards. It extracts contact signals and scoring data, then exports them to JSON/CSV and optionally to Google Sheets via the LeadScout server.

## What Hunter Does (MVP)

✅ **Discovers** candidate companies from public URLs (directories, company sites, job boards)
✅ **Extracts** contact signals: emails, contact pages, careers links, booking calendars
✅ **Finds** buying signals: video keywords ("webinar", "podcast", "training"), location hints
✅ **Scores** candidates using a heuristic model (0–100, A/B/C tiers)
✅ **Filters** by: remote-friendliness, Canada preference, USA review flags
✅ **Exports** to JSON, CSV, and optionally Google Sheets

## What Hunter Does NOT Do

❌ **No LinkedIn scraping** – Hunter never visits, crawls, or extracts data from LinkedIn URLs (enforced by `deny.domains.txt`)
❌ **No automated outreach** – Results are for manual review and outreach only
❌ **No headless browser** – Uses lightweight HTML parsing to respect rate limits and server resources
❌ **No backend changes needed** – Integrates with existing LeadScout server endpoints

---

## Compliance & Safety

✅ **Deny list enforcement** – Lincoln, Facebook, Twitter, Instagram, YouTube, GitHub all blocked by default
✅ **Robots.txt respect** – Best-effort checking (MVP; can be enhanced)  
✅ **Rate limiting** – Configurable delay between requests (default 800ms)
✅ **User agent** – Identifies as HunterBot/1.0 (transparent to hosts)
✅ **No secrets in outputs** – All leads sanitized, no credentials exposed

**Blocked domains (deny.domains.txt):**
```
linkedin.com
facebook.com
twitter.com
instagram.com
youtube.com
github.com
```

---

## Installation

Hunter is part of the LeadScout workspace.

```bash
# From repo root, install all workspace dependencies
npm install

# Build Hunter
npm run build:hunter
```

---

## Quick Start

### 1. Add URLs to discover

Edit `hunter/data/seeds.urls.txt` with URLs you want Hunter to process:

```
https://example.com/directory
https://jobs.example.com
https://remote-companies-list.co.uk
```

### 2. Run Hunter

```bash
npm run hunter
```

### 3. Review results

Results appear in:
- `hunter/out/leads-YYYY-MM-DD.json` – Full candidate data
- `hunter/out/leads-YYYY-MM-DD.csv` – Spreadsheet format

---

## Server Mode (Recommended) 🚀

**Hunter can score candidates using the LeadScout server and auto-capture to Google Sheets.**

This uses the server as the source of truth for scoring/tiering, so all insights come from the existing LeadScout intelligence.

### Prerequisites

1. LeadScout server is running:
   ```bash
   # In another terminal
   npm run dev:server
   ```

2. Server is configured with Google Sheets credentials (see root README for OAuth setup)

### Server Mode Usage

```bash
# Auto-discover, score with server, append Tier A/B leads to Google Sheets
npm run hunter -- --to=server

# Only capture Tier A leads (exclude Tier B)
npm run hunter -- --to=server --tier=A

# Include USA candidates (with us_review_required flag)
npm run hunter -- --to=server --allowUSCapture=true

# Use custom server URL
npm run hunter -- --to=server --serverUrl=http://localhost:3789

# Hybrid mode: score with server AND export to JSON/CSV
npm run hunter -- --to=server,json,csv
```

### What Happens in Server Mode

1. Hunter discovers URLs from `seeds.urls.txt`
2. For each URL (except denied domains like LinkedIn):
   - Extracts raw signals: emails, keywords, location hints
   - POSTs to server `/analyze` endpoint
   - Server scores using LeadScout's intelligence
3. If tier matches `--tier` filter:
   - POSTs to server `/append-lead` endpoint
   - Lead is written to Google Sheets
4. Hunter prints a summary per candidate

### Example Output

```
[HUNTER] Found 4 URLs to process
[HUNTER] 🔄 FETCH [1/4] https://www.intercom.com/careers
[HUNTER]   ✅ FOUND [B/65] Intercom (CA)
[HUNTER] 🔄 FETCH [2/4] https://www.hubspot.com/jobs
[HUNTER]   ✅ FOUND [A/82] HubSpot (US)
[HUNTER] ❌ BLOCKED [3/4] https://www.linkedin.com/... (denied domain: linkedin.com)
[HUNTER] ✓ Processed 4 URLs, found 2 qualified candidates
[HUNTER] ✓ Appended 2 leads to Google Sheets via server
```

---

## PondFinder: Refreshing Fishing Ponds 🎣

**Hunter includes a built-in "PondFinder" capability to automatically discover and refresh high-quality seed URLs from public web sources.**

PondFinder supports two discovery modes:

### Mode 1: Manual Expansion (no API key required)

Reads known company domains from `hunter/data/seeds.domains.txt` and generates candidate URLs by appending common URL patterns (`/careers`, `/jobs`, `/resources`, `/webinars`, etc.).

```bash
# Refresh seeds using manual expansion, then run Hunter
npm run hunter -- --refreshSeeds=true --pondMode=manual --to=json,csv

# Refresh seeds, score with server, auto-append to Google Sheets
npm run hunter -- --refreshSeeds=true --pondMode=manual --to=server --tier=AB
```

**What happens:**
1. PondFinder reads `hunter/data/seeds.domains.txt` (e.g., `intercom.com`, `hubspot.com`)
2. For each domain, generates URLs by appending patterns: `intercom.com/careers`, `intercom.com/jobs`, etc.
3. Filters out any denied domains (LinkedIn, Facebook, etc.)
4. Writes expanded URLs to `hunter/data/seeds.urls.txt`
5. Hunter then processes the refreshed URL list

**Configuration:** `hunter/data/seeds.ponds.json`

```json
{
  "queries": ["video production software", "motion graphics tool", ...],
  "url_patterns": ["/careers", "/jobs", "/resources", "/webinars", "/case-studies"],
  "max_results_per_query": 10,
  "allow_us": false,
  "output_file": "hunter/data/seeds.urls.txt"
}
```

### Mode 2: Serper API (advanced; requires API key)

Uses Serper (Google Search) to discover relevant companies based on keyword queries.

```bash
# Set Serper API key
$env:SERPER_API_KEY = "your-api-key-here"

# Refresh seeds using Serper, then process
npm run hunter -- --refreshSeeds=true --pondMode=serper --to=server --tier=A
```

**Prerequisites:**
1. Get a Serper API key at https://serper.dev/
2. Set environment variable: `export SERPER_API_KEY=your-key`

**What happens:**
1. PondFinder queries Serper with keywords from `seeds.ponds.json` (e.g., "video production software")
2. Extracts company domains from search results
3. Normalizes to canonical URLs and appends URL patterns
4. Filters denied domains and duplicates
5. Writes normalized URLs to `hunter/data/seeds.urls.txt`

### PondFinder Compliance

✅ **Respects deny list** – All denied domains (LinkedIn, Facebook, Twitter, etc.) are filtered before discovery
✅ **No login scraping** – Only queries public APIs (Serper) or uses curated seed lists
✅ **Rate limiting** – Manual mode is instant; Serper mode respects API limits via rate limiter
✅ **Canada/USA filtering** – Configured via `allow_us` flag in `seeds.ponds.json`

---

## CLI Options

```bash
# File-based export (default)
npm run hunter \
  --urls hunter/data/seeds.urls.txt \
  --out hunter/out \
  --remote_only false \
  --prefer_canada true \
  --include_us false \
  --rate_limit_ms 800 \
  --max_pages 50 \
  --debug

# Server mode (score + Google Sheets)
npm run hunter \
  --to=server \
  --serverUrl=http://localhost:3789 \
  --tier=AB \
  --allowUSCapture=false

# PondFinder mode (refresh seeds first, then process)
npm run hunter \
  --refreshSeeds=true \
  --pondMode=manual \
  --to=server
```

**Common Flags:**

- `--urls <file>` – URL list file (default: `hunter/data/seeds.urls.txt`)
- `--out <dir>` – Output directory for JSON/CSV (default: `hunter/out`)
- `--remote_only true|false` – Only return candidates with remote signal (default: false)
- `--prefer_canada true|false` – Boost Canada matches (default: true)
- `--include_us true|false` – Include USA candidates (default: false; if false, USA gets review flag)
- `--rate_limit_ms <ms>` – Delay between requests (default: 800)
- `--max_pages <n>` – Max pages to process (default: 50)
- `--debug` – Enable debug logging

**PondFinder Flags:**

- `--refreshSeeds true|false` – Run PondFinder before discovery (default: false)
- `--pondMode manual|serper` – Discovery mode (default: `manual`)
- `--pondsConfig <path>` – Path to ponds config file (default: `hunter/data/seeds.ponds.json`)

**Server Mode Flags:**

- `--to=json|csv|server|server,json` – Export destinations (default: `json,csv`)
  - `json` – Write to `hunter/out/leads-YYYY-MM-DD.json`
  - `csv` – Write to `hunter/out/leads-YYYY-MM-DD.csv`
  - `server` – Score with server + append to Google Sheets
- `--serverUrl <url>` – LeadScout server endpoint (default: `http://localhost:3789`)
- `--tier AB|ABC` – Filter tier (default: `AB`)
  - `AB` – Only capture Tier A and B candidates
  - `ABC` – Capture all tiers
- `--allowUSCapture true|false` – Auto-capture US candidates (default: false)
  - If false, US candidates are flagged `us_review_required=true` and skipped
  - If true, US candidates are treated normally

---

## MVP Status

### ✅ Working
- Manual URL provider: reads `seeds.urls.txt`
- HTML fetching with rate limiting & retries
- Contact signal extraction (emails, links, keywords, location hints)
- Local heuristic scoring (matches LeadScout scoring buckets)
- **Server-based scoring via `/analyze` endpoint** ✨
- **Google Sheets auto-capture via `/append-lead` endpoint** ✨
- **PondFinder: Manual expansion mode** ✨
- **PondFinder: Serper API mode** ✨
- Tier filtering (A+B or ABC)
- USA candidate review flagging
- CSV + JSON export
- Canada preference boost and country detection

### 🔄 Stubbed (ready for integration)
- **Manual Queries Provider** – reads `seeds.queries.txt` but requires a search provider to execute queries
  - **To integrate**: Implement Serper API (or similar) in `src/providers/serper.stub.ts`
  - API key required; see instructions in `src/providers/serper.stub.ts`

---

## Sample Data

### Queries (`hunter/data/seeds.queries.txt`)

```
remote content marketing manager Canada video
B2B SaaS webinar editing agency Canada remote
learning and development training video vendor Canada
podcast editing service Canada fully remote
training course creation video production Canada
remote-first media buying agency Canada
webinar platform vendor Canada
video testimonial production Canada remote
sales enablement video services Canada
social media content agency Canada remote
```

### URLs (`hunter/data/seeds.urls.txt`)

```
https://www.notion.so/Remote-first-Canadian-companies-list
https://www.canadianondemand.com/directory
https://www.weworkremotely.com
https://remote.co
https://www.toptal.com
...
```

### Deny List (`hunter/data/deny.domains.txt`)

Pre-filled with social platforms (LinkedIn, Facebook, Twitter, etc.) to prevent scraping.

---

## Output Format

### JSON Export

```json
{
  "metadata": {
    "exported_at": "2026-02-09T12:34:56.789Z",
    "total_candidates": 15,
    "tiers": { "A": 3, "B": 7, "C": 5, "SKIP": 0 }
  },
  "candidates": [
    {
      "domain": "example.com",
      "company_name": "Example Corp",
      "company_url": "https://example.com",
      "emails": ["hello@example.com"],
      "contact_page_url": "https://example.com/contact",
      "careers_page_url": "https://example.com/careers",
      "demo_booking_url": "https://calendly.com/demo",
      "video_keywords": ["webinar", "training"],
      "location_keywords": ["Canada", "remote"],
      "country_guess": "CA",
      "remote_signal": "YES",
      "us_review_required": false,
      "score": 78,
      "tier": "A",
      "confidence": 85,
      "recommended_contact_method": "email",
      "suggested_outreach_angle": "training",
      "source_url": "https://example.com",
      "discovered_at": "2026-02-09T12:34:56.789Z"
    }
  ]
}
```

### CSV Export

| company_name | domain | score | tier | country_guess | remote_signal | emails | ... |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Example Corp | example.com | 78 | A | CA | YES | hello@example.com | ... |

---

## Configuration

Edit `hunter/config/defaults.json` to change defaults globally:

```json
{
  "rate_limit_ms": 800,
  "max_pages": 50,
  "timeout_ms": 15000,
  "user_agent": "Mozilla/5.0 ...",
  "remote_only": false,
  "prefer_canada": true,
  "include_us": false,
  "debug": false
}
```

---

## Integration with LeadScout Server

Hunter can optionally append candidates to Google Sheets via the LeadScout server's `/append-lead` endpoint.

**Note:** This requires the server to be running and configured with Google Sheets credentials.

```typescript
// See src/export/toServer.ts
// Function is available but not yet wired in CLI
```

---

## Architecture

```
hunter/
├── config/
│   └── defaults.json                # Default configuration
├── data/
│   ├── seeds.queries.txt            # Search queries (stubbed for MVP)
│   ├── seeds.urls.txt               # URLs to discover
│   └── deny.domains.txt             # Domains to skip
├── out/
│   └── leads-YYYY-MM-DD.{json,csv}  # Results (git-ignored)
└── src/
    ├── index.ts                     # Main CLI entry
    ├── types.ts                     # TypeScript interfaces
    ├── config.ts                    # Config loader
    ├── providers/                   # URL/query source adapters
    │   ├── provider.ts              # Interface
    │   ├── manualUrls.ts            # File-based URLs
    │   ├── manualQueries.ts         # File-based queries (stub)
    │   └── serper.stub.ts           # External search provider (stub)
    ├── fetch/                       # HTTP client
    │   ├── httpClient.ts            # Rate-limited fetcher
    │   └── robots.ts                # Robots.txt checker
    ├── parse/                       # Content parsing
    │   ├── extract.ts               # HTML → text/links
    │   ├── signals.ts               # Email/keyword extraction
    │   └── normalize.ts             # Infer company/country/remote
    ├── score/                       # Scoring logic
    │   └── score.ts                 # Rank candidates
    ├── export/                      # Output adapters
    │   ├── toJson.ts                # JSON export
    │   ├── toCsv.ts                 # CSV export
    │   └── toServer.ts              # LeadScout server integration
    └── utils/                       # Helpers
        ├── logger.ts                # Console logging
        ├── strings.ts               # Text utilities
        └── urls.ts                  # URL utilities
```

---

## Scoring Logic

Candidates are scored 0–100 and placed into tiers:

- **Tier A** (70–100): Strong fit – has email, video keywords, remote signal, Canada preference
- **Tier B** (45–69): Medium fit – some contact methods or signals present
- **Tier C** (20–44): Weak fit – minimal signals
- **SKIP** (<20): Filtered out

**Confidence** (0–100) reflects how certain Hunter is about the score based on number and quality of signals.

---

## Troubleshooting

### "No URLs found in seeds.urls.txt"

Make sure you've added URLs to `hunter/data/seeds.urls.txt`, one per line.

### "Found 0 candidates"

Check if Hunter is filtering too aggressively:
- Try `--remote_only false` to include non-remote results
- Try `--include_us true` to include USA candidates
- Check `--debug` logs to see why candidates were filtered

### "Failed to fetch" messages

- URLs may be blocked by rate limiting or robots.txt
- Try increasing `--rate_limit_ms` to 1500+
- Check if URL is reachable manually first

### "Query-based providers are not implemented"

For MVP, Hunter uses file-based URLs only. To add search query support:
1. Get a Serper API key from https://serper.dev
2. Implement `SerperProvider.getUrls()` in `src/providers/serper.stub.ts`
3. Set `SERPER_API_KEY=your_key` in `.env`

---

## Next Steps

1. **Review candidates** – View outputs in JSON/CSV
2. **Manual outreach** – Use suggested contact methods
3. **Feedback** – Mark successful/failed outreach for future scoring refinement
4. **Scale** – Integrate more URL sources (directories, APIs, crawlers)

---

## License

Part of LeadScout. See root README.
