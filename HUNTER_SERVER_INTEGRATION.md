# Hunter + LeadScout Server Integration

**Status**: ✅ **COMPLETE & TESTED**

This document summarizes the integration of Hunter with the LeadScout server for scoring and Google Sheets capture.

---

## What Changed

### 1. Hunter Types (`hunter/src/types.ts`)

Added server integration config options:
```typescript
interface HunterConfig {
  // ... existing options ...
  // NEW: Server integration
  use_server: boolean;
  server_url: string;
  tier_filter: "AB" | "ABC";
  allow_us_capture: boolean;
  export_to: ("json" | "csv" | "server")[];
}
```

### 2. Server Integration (`hunter/src/export/toServer.ts`)

Completely rewritten to:
- `scoreWithServer()` – POST to `/analyze` endpoint with extracted signals, return score/tier
- `appendLeadToServer()` – POST to `/append-lead` endpoint with LeadRow payload

Both functions handle errors gracefully and log results.

### 3. CLI Configuration (`hunter/src/config.ts`)

Enhanced `loadConfig()` to parse new flags:
- `--to=json|csv|server|server,json` – Export destinations
- `--serverUrl <url>` – Server endpoint (default: localhost:3789)
- `--tier AB|ABC` – Tier filter (default: AB)
- `--allowUSCapture true|false` – USA candidate handling

### 4. Main CLI (`hunter/src/index.ts`)

Major update to support server mode:
- Imports `scoreWithServer` and `appendLeadToServer`
- When `use_server=true`:
  - Scores each candidate via server `/analyze` endpoint
  - Auto-appends to Google Sheets if tier matches filter + US rules
- Conditional file exports (JSON/CSV only when needed)
- Enhanced logging per candidate:
  - `🔄 FETCH` – Attempting to fetch URL
  - `✅ FOUND [Tier/Score]` – Candidate discovered
  - `⏭️ SKIP` – Filtered out with reason
  - `❌ BLOCKED` – Denied domain
- Server mode summary shows "Appended to Google Sheets" count

### 5. Documentation (`hunter/README.md`)

Added:
- **Server Mode (Recommended)** section with use cases
- Example commands for server integration
- Server mode workflow diagram
- New CLI options documentation
- Compliance & Safety section (LinkedIn/Facebook/etc. blocking)

### 6. Root Integration (`package.json`)

Already set up with Hunter workspace and scripts:
```json
{
  "scripts": {
    "hunt": "cd hunter && npm run hunter"
  }
}
```

---

## Verification Checklist ✅

### Build & Install
- ✅ `npm install` – Workspace dependencies installed
- ✅ `npm run build` – All 4 packages compile successfully (shared, server, extension, hunter)
- ✅ No TypeScript errors or warnings

### Functionality Tests
- ✅ **File mode (default)**: `npm run hunter -- --tier=ABC` → exports to JSON/CSV
- ✅ **Server mode**: `npm run hunter -- --to=server --tier=ABC` → 4/4 leads appended to Google Sheets
- ✅ **Tier filtering**: `--tier=AB` skips all C tier candidates correctly
- ✅ **LinkedIn blocking**: LinkedIn URLs are blocked with "BLOCKED [5/5]" message
- ✅ **USA review flag**: US candidates flagged as `us_review_required=true`

### Server Communication
- ✅ Server `/analyze` endpoint called successfully (scores: C/23, C/15, etc.)
- ✅ Server `/append-lead` endpoint called successfully (4 leads appended)
- ✅ Server `/health` check returns `{"status":"ok"}`

### Compliance
- ✅ LinkedIn URL (`linkedin.com`) blocked by deny list
- ✅ Facebook, Twitter, etc. blocked by deny list
- ✅ hunter/out/* git-ignored except .gitkeep
- ✅ No secrets committed to repo

---

## CLI Usage Examples

### File Mode (Local Export)
```bash
# Export to JSON + CSV (default)
npm run hunter

# Include all tiers
npm run hunter -- --tier=ABC

# Skip non-remote candidates
npm run hunter -- --tier=ABC --remote_only=true
```

### Server Mode (LeadScout Integration)
```bash
# Score with server + append Tier A/B to Google Sheets
npm run hunter -- --to=server

# Include all tiers
npm run hunter -- --to=server --tier=ABC

# Allow USA candidates
npm run hunter -- --to=server --allowUSCapture=true

# Custom server URL
npm run hunter -- --to=server --serverUrl=http://my-server:3789

# Hybrid: Score server + export files
npm run hunter -- --to=server,json,csv
```

---

## Payload Formats

### POST `/analyze` (Hunter → Server)

```typescript
{
  page_url: string;
  extracted_fields: {
    name: string;
    title: string;
    company: string;
    location: string;
    page_url: string;
  };
  raw_text_sample: string;
  signals: SignalMatch[];
}
```

### Response `/analyze` (Server → Hunter)

```typescript
{
  normalized_lead: ExtractedFields;
  score: number;
  tier: "A" | "B" | "C";
  evidence: string[];
  outreach_reco: {
    suggested_contact_method: string;
    suggested_angle: string;
    outreach_hook: string;
    call_to_action: string;
    onboarding_next_step: string;
  };
}
```

### POST `/append-lead` (Hunter → Server)

```typescript
{
  lead: {
    timestamp_iso: string;
    name: string;
    title: string;
    company: string;
    location: string;
    page_url: string;
    score: number;
    tier: "A" | "B" | "C";
    evidence: string;
    suggested_contact_method: string;
    suggested_angle: string;
    outreach_hook: string;
    call_to_action: string;
    onboarding_next_step: string;
    status: string;
    pipeline_stage: string;
    next_action: string;
    followup_date: string;
    notes: string;
  };
}
```

---

## Architecture

```
Hunter Flow (Server Mode)
┌─────────────────┐
│  seeds.urls.txt │
└────────┬────────┘
         │
    ┌────▼────────┐
    │   Fetch     │──── Check /analyze payload compatibility
    │   HTML      │
    └────┬────────┘
         │
    ┌────▼──────────────────┐
    │  Extract Signals      │
    │  - emails             │
    │  - keywords           │
    │  - location hints     │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  POST /analyze        │◄─── LeadScout Server
    │  (Scoring)            │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  Tier Filter Check    │
    │  (AB vs ABC)          │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  POST /append-lead    │◄─── Google Sheets
    │  (if passes filter)   │
    └──────────────────────┘
```

---

## Deny List Enforcement

**Blocked by default:**
- linkedin.com
- facebook.com
- twitter.com
- instagram.com
- youtube.com
- github.com

**Why:**
- LinkedIn: Prevents automated scraping/violation of ToS
- Social media: User engagement platforms, not B2B discovery sources
- GitHub: Not a B2B signal source for Hunter's use case

---

## Error Handling

### Server Unreachable
```
Hunter detects no server response → logs warning → skips server scoring → continues with local scoring
```

### Invalid URLs
```
Skipped with debug log: "Skipping invalid URL: ..."
```

### Duplicate Domains
```
Second fetch of same domain → skipped with debug log
```

### Network Timeout
```
Fetch fails after 3 retries → logs warning → continues to next URL
```

---

## Security & Privacy

✅ **No LinkedIn scraping** – Deny list enforces off-LinkedIn discovery only  
✅ **No automated outreach** – Hunter exports candidates for manual review  
✅ **No headless browser** – Lightweight HTTP client, no JS execution  
✅ **Server credentials** – OAuth handled by LeadScout server, not by Hunter  
✅ **Rate limiting** – Configurable delay (default 800ms) respects target sites  
✅ **User agent** – Identifies as "HunterBot/1.0" (transparent)  

---

## Next Steps

1. **Monitor results** – Check Google Sheets for captured leads
2. **Tweak scoring** – Adjust server-side LeadScout scoring if needed
3. **Expand sources** – Add more URL sources (industry directories, job boards)
4. **Integrate Serper** – Implement query-based discovery (see `src/providers/serper.stub.ts`)
5. **A/B test tiers** – Compare --tier=AB vs --tier=ABC for conversion rates

---

## Files Modified/Created

### Modified
- `hunter/src/types.ts` – Added server config options
- `hunter/src/config.ts` – Added CLI flag parsing
- `hunter/src/index.ts` – Added server scoring logic + logging
- `hunter/README.md` – Added Server Mode section + updated docs
- `package.json` – Already had Hunter workspace + scripts

### Created
- `hunter/src/export/toServer.ts` – Server integration functions

### Not Modified (as per constraints)
- `extension/*` – No changes (Chrome extension continues to work)
- `server/*` – No changes (existing endpoints used)
- `shared/*` – No changes (types reused)

---

## Test Results

### Test 1: Build Succeeded
```
✓ npm run build
  - shared: tsc ✓
  - server: tsc ✓
  - extension: tsc ✓
  - hunter: tsc ✓
```

### Test 2: Server Health Check
```
✓ curl http://localhost:3789/health
  {"status":"ok","google_auth":"connected","timestamp":"2026-02-10T01:16:45.573Z"}
```

### Test 3: File Mode Export
```
✓ npm run hunter -- --tier=ABC
  - Found 4 URLs
  - Scored 4 candidates (all Tier C due to local heuristics)
  - Exported to leads-2026-02-10.json + leads-2026-02-10.csv
```

### Test 4: Server Mode Scoring
```
✓ npm run hunter -- --to=server --tier=ABC
  - Fetched 4 URLs
  - Each scored [C/23] or [C/15] via server /analyze
  - All 4 appended to Google Sheets
  - Summary: "✓ Appended 4 leads to Google Sheets via server"
```

### Test 5: Tier Filtering
```
✓ npm run hunter -- --to=server --tier=AB
  - Same 4 candidates scored
  - All skipped (none are Tier A/B)
  - 0 leads appended to Google Sheets
  - Summary: "Appended to Google Sheets: 0"
```

### Test 6: LinkedIn Blocking
```
✓ Added https://www.linkedin.com/company/spotify to seeds.urls.txt
✓ npm run hunter -- --tier=ABC
  - All 5 URLs processed
  - LinkedIn URL logged as: "❌ BLOCKED [5/5] ... (denied domain: linkedin.com)"
  - No data fetched from LinkedIn
```

---

## Conclusion

Hunter is now fully integrated with the LeadScout server as the source of truth for scoring and Google Sheets capture. The module maintains backward compatibility (file export still works) while adding powerful server-side intelligence.

**No changes required to extension, server, or shared packages.**

✅ **Ready for production use.**
