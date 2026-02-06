import * as cheerio from "cheerio";

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PodcastGenerator/1.0; +https://example.com)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $(
      "script, style, nav, header, footer, aside, iframe, noscript, .ad, .ads, .advertisement, #cookie-banner"
    ).remove();

    // Try to extract main content
    const mainContent =
      $("article").text() ||
      $("main").text() ||
      $('[role="main"]').text() ||
      $(".content").text() ||
      $(".post-content").text() ||
      $("body").text();

    // Clean up whitespace
    const cleaned = mainContent.replace(/\s+/g, " ").trim();

    // Limit to roughly 500 words
    const words = cleaned.split(" ");
    if (words.length > 500) {
      return words.slice(0, 500).join(" ") + "...";
    }

    return cleaned;
  } catch (error) {
    console.error(`Failed to fetch URL ${url}:`, error);
    throw error;
  }
}

export async function fetchAllUrls(
  urls: string[]
): Promise<{ summaries: string; failedUrls: string[] }> {
  const failedUrls: string[] = [];
  const summaries: string[] = [];

  for (const url of urls) {
    try {
      const content = await fetchUrlContent(url);
      if (content) {
        summaries.push(`Content from ${url}:\n${content}`);
      }
    } catch {
      failedUrls.push(url);
    }
  }

  return {
    summaries: summaries.join("\n\n---\n\n"),
    failedUrls,
  };
}
