/* ──────────────────────────────────────────────────────────
   Hunter – URL Utilities
   ────────────────────────────────────────────────────────── */

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function isDeniedDomain(domain: string, deniedList: string[]): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
  return deniedList.some((denied) =>
    normalizedDomain.includes(denied.toLowerCase())
  );
}

export function resolveUrl(baseUrl: string, relativeUrl: string): string {
  if (!relativeUrl) return "";
  if (relativeUrl.startsWith("http")) return relativeUrl;
  if (relativeUrl.startsWith("//")) return "https:" + relativeUrl;

  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return "";
  }
}
