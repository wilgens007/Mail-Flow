/**
 * Email tracking utilities: open pixel injection, click-link rewriting,
 * and HTML-to-plain-text conversion for multipart emails.
 */

/** 1x1 transparent GIF bytes */
const PIXEL_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export function getTrackingPixel(): Buffer {
  return PIXEL_GIF;
}

/**
 * Inject an open-tracking pixel just before </body> (or append if no body tag).
 */
export function injectTrackingPixel(html: string, appUrl: string, sendId: string): string {
  const pixel = `<img src="${appUrl}/t/o/${sendId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * Rewrite all http(s) links to go through the click tracker.
 * Skips unsubscribe links, mailto:, anchors, and already-tracked URLs.
 */
export function rewriteLinksForTracking(html: string, appUrl: string, sendId: string): string {
  return html.replace(/href="([^"]+)"/gi, (match, url: string) => {
    if (
      !/^https?:\/\//i.test(url) ||
      url.includes("/t/c/") ||
      url.includes("/unsubscribe") ||
      url.includes("{{unsubscribeUrl}}")
    ) {
      return match;
    }
    const tracked = `${appUrl}/t/c/${sendId}?u=${encodeURIComponent(url)}`;
    return `href="${tracked}"`;
  });
}

/**
 * Convert HTML email body to a reasonable plain-text version.
 * Not perfect, but far better than no text part for deliverability.
 */
export function htmlToText(html: string): string {
  let text = html;

  // Preserve link destinations: <a href="url">label</a> -> "label (url)"
  text = text.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, url, label) => {
    const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
    if (!cleanLabel || cleanLabel === url) return url;
    return `${cleanLabel} (${url})`;
  });

  // Block elements -> line breaks
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, "...")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");

  // Collapse whitespace
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}
