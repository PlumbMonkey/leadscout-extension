/* ──────────────────────────────────────────────────────────
   Hunter – Signal Extractor (emails, contact links, keywords)
   ────────────────────────────────────────────────────────── */

import { isValidEmail, containsKeyword } from "../utils/strings";
import { resolveUrl } from "../utils/urls";

export interface Signals {
  emails: string[];
  contact_page_url?: string;
  careers_page_url?: string;
  demo_booking_url?: string;
  social_links: string[];
  video_keywords: string[];
  location_keywords: string[];
}

const VIDEO_KEYWORDS = [
  "webinar",
  "podcast",
  "training",
  "video",
  "ads",
  "advertisement",
  "social",
  "youtube",
  "case study",
  "testimonial",
  "demo",
  "screencast",
  "animation",
  "editing",
  "production",
];

const LOCATION_KEYWORDS = [
  "canada",
  "canadian",
  "remote",
  "distributed",
  "on-site",
  "onsite",
  "in-office",
  "hybrid",
  "work from home",
  "wfh",
];

export function extractSignals(
  text: string,
  links: string[],
  baseUrl: string
): Signals {
  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const potentialEmails = text.match(emailRegex) || [];
  const emails = potentialEmails
    .filter(isValidEmail)
    .filter((e) => !e.includes("example") && !e.includes("test"))
    .slice(0, 5); // Limit to top 5

  // Extract contact/careers links
  const lowerText = text.toLowerCase();
  const lowerLinks = links.map((l) => l.toLowerCase());

  let contact_page_url: string | undefined;
  let careers_page_url: string | undefined;
  let demo_booking_url: string | undefined;

  links.forEach((link) => {
    const lowerLink = link.toLowerCase();
    if (lowerLink.includes("contact")) {
      contact_page_url = resolveUrl(baseUrl, link);
    }
    if (lowerLink.includes("career") || lowerLink.includes("jobs")) {
      careers_page_url = resolveUrl(baseUrl, link);
    }
    if (
      lowerLink.includes("demo") ||
      lowerLink.includes("booking") ||
      lowerLink.includes("schedule") ||
      lowerLink.includes("calendar")
    ) {
      demo_booking_url = resolveUrl(baseUrl, link);
    }
  });

  // Extract social links (exclude LinkedIn scraping, but can reference)
  const socialLinks: string[] = [];
  links.forEach((link) => {
    const lowerLink = link.toLowerCase();
    if (
      lowerLink.includes("twitter.com") ||
      lowerLink.includes("facebook.com") ||
      lowerLink.includes("instagram.com") ||
      lowerLink.includes("youtube.com")
    ) {
      socialLinks.push(resolveUrl(baseUrl, link));
    }
  });

  // Extract keywords
  const video_keywords = containsKeyword(text, VIDEO_KEYWORDS);
  const location_keywords = containsKeyword(lowerText, LOCATION_KEYWORDS);

  return {
    emails: [...new Set(emails)],
    contact_page_url,
    careers_page_url,
    demo_booking_url,
    social_links: [...new Set(socialLinks)],
    video_keywords,
    location_keywords,
  };
}
