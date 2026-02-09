/* ──────────────────────────────────────────────────────────
   LeadScout – Popup script
   Controls the popup UI, orchestrates extraction → analysis
   → capture flow.
   ────────────────────────────────────────────────────────── */

const SERVER = "http://localhost:3789";

// ── DOM refs ──────────────────────────────────────────────
const btnAnalyze = document.getElementById("btn-analyze") as HTMLButtonElement;
const btnCapture = document.getElementById("btn-capture") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const resultsEl = document.getElementById("results") as HTMLDivElement;

const rName = document.getElementById("r-name")!;
const rTitle = document.getElementById("r-title")!;
const rCompany = document.getElementById("r-company")!;
const rLocation = document.getElementById("r-location")!;
const rScore = document.getElementById("r-score")!;
const rTier = document.getElementById("r-tier")!;
const rEvidence = document.getElementById("r-evidence")!;
const rContact = document.getElementById("r-contact")!;
const rAngle = document.getElementById("r-angle")!;
const rHook = document.getElementById("r-hook")!;
const rCTA = document.getElementById("r-cta")!;
const rNext = document.getElementById("r-next")!;

// ── State ─────────────────────────────────────────────────
let lastAnalysis: any = null;
let analyzing = false;
let capturing = false;

// ── Status helpers ────────────────────────────────────────
function showStatus(msg: string, type: "info" | "success" | "error" | "warn") {
  statusEl.textContent = msg;
  statusEl.className = type;
}

function clearStatus() {
  statusEl.className = "";
  statusEl.textContent = "";
  statusEl.style.display = "none";
}

// ── Analyze flow ──────────────────────────────────────────
btnAnalyze.addEventListener("click", async () => {
  if (analyzing) return;
  analyzing = true;
  btnAnalyze.disabled = true;
  btnCapture.disabled = true;
  resultsEl.classList.remove("visible");
  lastAnalysis = null;
  showStatus("⏳ Extracting page data...", "info");

  try {
    // 1. Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");

    // 2. Inject content script and get extraction result
    const injection = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractLeadFromPage,
    });

    const payload = injection?.[0]?.result;
    if (!payload || !payload.extracted_fields) {
      throw new Error("Content script returned no data.");
    }

    showStatus("⏳ Analyzing lead...", "info");

    // 3. Send to server /analyze
    const resp = await fetch(`${SERVER}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_url: payload.extracted_fields.page_url,
        extracted_fields: payload.extracted_fields,
        raw_text_sample: payload.raw_text_sample,
        signals: payload.signals,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || `Server error ${resp.status}`);
    }

    const analysis = await resp.json();
    lastAnalysis = analysis;

    // 4. Render results
    renderResults(analysis);
    btnCapture.disabled = false;
    showStatus("✅ Analysis complete!", "success");

  } catch (err: any) {
    console.error("Analyze error:", err);
    showStatus(`❌ ${err.message}`, "error");
  } finally {
    analyzing = false;
    btnAnalyze.disabled = false;
  }
});

// ── Capture flow ──────────────────────────────────────────
btnCapture.addEventListener("click", async () => {
  if (capturing || !lastAnalysis) return;
  capturing = true;
  btnCapture.disabled = true;
  showStatus("⏳ Writing to Google Sheets...", "info");

  try {
    const lead = {
      timestamp_iso: new Date().toISOString(),
      name: lastAnalysis.normalized_lead.name,
      title: lastAnalysis.normalized_lead.title,
      company: lastAnalysis.normalized_lead.company,
      location: lastAnalysis.normalized_lead.location,
      page_url: lastAnalysis.normalized_lead.page_url,
      score: lastAnalysis.score,
      tier: lastAnalysis.tier,
      evidence: JSON.stringify(lastAnalysis.evidence),
      suggested_contact_method: lastAnalysis.outreach_reco.suggested_contact_method,
      suggested_angle: lastAnalysis.outreach_reco.suggested_angle,
      outreach_hook: lastAnalysis.outreach_reco.outreach_hook,
      call_to_action: lastAnalysis.outreach_reco.call_to_action,
      onboarding_next_step: lastAnalysis.outreach_reco.onboarding_next_step,
      status: "new",
    };

    const resp = await fetch(`${SERVER}/append-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead }),
    });

    const data = await resp.json();

    if (data.duplicate) {
      showStatus("⚠️ Already captured recently.", "warn");
    } else if (data.success) {
      showStatus("✅ Lead captured to Google Sheets!", "success");
    } else {
      throw new Error(data.message || "Failed to capture lead.");
    }
  } catch (err: any) {
    console.error("Capture error:", err);
    showStatus(`❌ ${err.message}`, "error");
  } finally {
    capturing = false;
    btnCapture.disabled = false;
  }
});

// ── Render ────────────────────────────────────────────────
function renderResults(data: any) {
  const lead = data.normalized_lead;
  rName.textContent = lead.name || "—";
  rTitle.textContent = lead.title || "—";
  rCompany.textContent = lead.company || "—";
  rLocation.textContent = lead.location || "—";

  rScore.textContent = String(data.score);

  rTier.textContent = `Tier ${data.tier}`;
  rTier.className = `tier-badge tier-${data.tier}`;

  rEvidence.innerHTML = "";
  (data.evidence as string[]).forEach((e) => {
    const li = document.createElement("li");
    li.textContent = e;
    rEvidence.appendChild(li);
  });

  const reco = data.outreach_reco;
  rContact.textContent = reco.suggested_contact_method;
  rAngle.textContent = reco.suggested_angle;
  rHook.textContent = reco.outreach_hook;
  rCTA.textContent = reco.call_to_action;
  rNext.textContent = reco.onboarding_next_step;

  resultsEl.classList.add("visible");
}

// ── Inline extraction function (injected into page context) ──
// This is the same logic as content.ts, but inlined so
// chrome.scripting.executeScript can pass it as `func`.
function extractLeadFromPage() {
  const SIGNAL_KEYWORDS: Record<string, string[]> = {
    video_production: [
      "video", "producer", "webinar", "podcast", "training video",
      "explainer", "animation", "motion graphics", "post-production",
      "editing", "filmmaker", "videographer",
    ],
    content_marketing: [
      "content", "marketing", "comms", "communications", "brand",
      "campaigns", "content ops", "internal comms", "enablement",
      "social media", "demand gen",
    ],
    seniority: [
      "manager", "director", "head of", "vp ",
      "vice president", "lead", "senior", "chief",
      "founder", "co-founder", "principal",
    ],
    remote_canada: [
      "remote", "canada", "canadian", "toronto", "vancouver",
      "montreal", "ottawa", "calgary",
    ],
    recency: [
      "just posted", "1 day ago", "2 days ago", "3 days ago",
      "days ago", "hours ago", "1 week ago", "weeks ago",
      "recently", "new role", "just started",
    ],
    accessibility: [
      "accessibility", "captions", "closed captions", "subtitles",
      "wcag", "ada compliant", "sound-off", "readable",
      "inclusive design", "alt text",
    ],
  };

  function textOf(el: Element | null): string {
    return el?.textContent?.trim() ?? "";
  }

  function qsText(selectors: string[]): string {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const t = textOf(el);
          if (t) return t;
        }
      } catch { /* ignore bad selectors */ }
    }
    return "";
  }

  function getVisibleText(): string {
    return (document.body?.innerText ?? "").slice(0, 5000);
  }

  const isLI = location.hostname.includes("linkedin.com");

  let fields;
  if (isLI) {
    fields = {
      name: qsText([
        ".text-heading-xlarge", "h1.top-card-layout__title",
        ".pv-top-card--list li:first-child", "h1",
      ]),
      title: qsText([
        ".text-body-medium.break-words", ".top-card-layout__headline",
        ".pv-top-card--list-bullet li",
      ]),
      company: qsText([
        "button[aria-label*='Current company'] span",
        ".pv-top-card--experience-list-item",
        ".top-card-layout__second-subline span:first-child",
      ]),
      location: qsText([
        ".text-body-small.inline.t-black--light.break-words",
        ".top-card-layout__second-subline span:last-child",
        "span.t-black--light",
      ]),
    };
  } else {
    let name = qsText(["h1", "[data-testid='name']", ".author-name"]);
    if (!name) {
      const ogTitle = document.querySelector<HTMLMetaElement>("meta[property='og:title']");
      if (ogTitle) name = ogTitle.content.trim();
    }
    if (!name) name = document.title.split(/[|\-–—]/)[0].trim();

    fields = {
      name,
      title: qsText(["h2", ".job-title", "[data-testid='title']", ".role", ".subtitle"]),
      company: (() => {
        let c = qsText([".company-name", "[data-testid='company']", ".organization", ".employer"]);
        if (!c) {
          const ogSite = document.querySelector<HTMLMetaElement>("meta[property='og:site_name']");
          if (ogSite) c = ogSite.content.trim();
        }
        return c;
      })(),
      location: qsText([".location", "[data-testid='location']", "address", ".city"]),
    };
  }

  const rawText = getVisibleText();
  const lower = rawText.toLowerCase();
  const signals: Array<{ category: string; matched: string[] }> = [];

  for (const [category, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
    const matched: string[] = [];
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) matched.push(kw);
    }
    if (matched.length > 0) signals.push({ category, matched });
  }

  return {
    extracted_fields: { ...fields, page_url: location.href },
    signals,
    raw_text_sample: rawText,
  };
}
