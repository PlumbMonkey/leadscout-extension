/* ──────────────────────────────────────────────────────────
   LeadScout – Content Script
   Injected into the active tab to extract lead data from the
   visible DOM.  Runs ONLY when triggered by the popup.
   ────────────────────────────────────────────────────────── */

(() => {
  // ── Signal keyword dictionaries (mirrored from shared for content-script isolation) ──
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

  // ── Utility ──────────────────────────────────────────────
  function textOf(el: Element | null): string {
    return el?.textContent?.trim() ?? "";
  }

  function qsText(selectors: string[]): string {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const t = textOf(el);
        if (t) return t;
      }
    }
    return "";
  }

  function getVisibleText(): string {
    const body = document.body?.innerText ?? "";
    return body.slice(0, 5000);
  }

  // ── LinkedIn-specific heuristics ─────────────────────────
  function isLinkedIn(): boolean {
    return location.hostname.includes("linkedin.com");
  }

  function extractLinkedIn() {
    const name = qsText([
      ".text-heading-xlarge",                   // profile name (modern)
      "h1.top-card-layout__title",             // public profile
      ".pv-top-card--list li:first-child",
      "h1",
    ]);

    const title = qsText([
      ".text-body-medium.break-words",          // headline
      ".top-card-layout__headline",
      ".pv-top-card--list-bullet li",
    ]);

    const company = qsText([
      "button[aria-label*='Current company'] span",
      ".pv-top-card--experience-list-item",
      ".top-card-layout__second-subline span:first-child",
    ]);

    const location = qsText([
      ".text-body-small.inline.t-black--light.break-words",
      ".top-card-layout__second-subline span:last-child",
      "span.t-black--light",
    ]);

    return { name, title, company, location };
  }

  // ── Generic heuristics (any site) ────────────────────────
  function extractGeneric() {
    // Name: try <h1>, og:title, page title
    let name = qsText(["h1", "[data-testid='name']", ".author-name"]);
    if (!name) {
      const ogTitle = document.querySelector<HTMLMetaElement>("meta[property='og:title']");
      if (ogTitle) name = ogTitle.content.trim();
    }
    if (!name) name = document.title.split(/[|\-–—]/)[0].trim();

    // Title / role
    const title = qsText([
      "h2",
      ".job-title",
      "[data-testid='title']",
      ".role",
      ".subtitle",
    ]);

    // Company
    let company = qsText([
      ".company-name",
      "[data-testid='company']",
      ".organization",
      ".employer",
    ]);
    if (!company) {
      const ogSite = document.querySelector<HTMLMetaElement>("meta[property='og:site_name']");
      if (ogSite) company = ogSite.content.trim();
    }

    // Location
    const location = qsText([
      ".location",
      "[data-testid='location']",
      "address",
      ".city",
    ]);

    return { name, title, company, location };
  }

  // ── Signal detection ─────────────────────────────────────
  function detectSignals(rawText: string) {
    const lower = rawText.toLowerCase();
    const results: Array<{ category: string; matched: string[] }> = [];

    for (const [category, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
      const matched: string[] = [];
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) {
          matched.push(kw);
        }
      }
      if (matched.length > 0) {
        results.push({ category, matched });
      }
    }
    return results;
  }

  // ── Main extraction ──────────────────────────────────────
  function extractLead() {
    const fields = isLinkedIn() ? extractLinkedIn() : extractGeneric();
    const rawText = getVisibleText();
    const signals = detectSignals(rawText);

    return {
      extracted_fields: {
        name: fields.name,
        title: fields.title,
        company: fields.company,
        location: fields.location,
        page_url: location.href,
      },
      signals,
      raw_text_sample: rawText,
    };
  }

  // Return extraction result to the caller (chrome.scripting.executeScript)
  return extractLead();
})();
