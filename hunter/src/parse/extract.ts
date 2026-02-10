/* ──────────────────────────────────────────────────────────
   Hunter – HTML Content Extractor
   ────────────────────────────────────────────────────────── */

import cheerio from "cheerio";

export interface ExtractedContent {
  text: string;
  links: string[];
  title: string;
  meta_description: string;
}

export function extractContent(html: string): ExtractedContent {
  try {
    const $ = cheerio.load(html);

    // Remove script and style tags
    $("script, style").remove();

    // Extract text
    const text = $("body").text().slice(0, 10000).trim();

    // Extract all links
    const links: string[] = [];
    $("a[href]").each((_i, elem) => {
      const href = $(elem).attr("href");
      if (href) links.push(href);
    });

    // Extract title and meta description
    const title = $("title").text();
    const meta_description = $("meta[name='description']").attr("content") || "";

    return {
      text,
      links,
      title,
      meta_description,
    };
  } catch (error) {
    return {
      text: html.slice(0, 10000),
      links: [],
      title: "",
      meta_description: "",
    };
  }
}
