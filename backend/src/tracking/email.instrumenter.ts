import { config } from '../config/env.js';

export interface InstrumentOptions {
  baseUrl?: string;
}

/**
 * Validates if a destination URL is eligible for click tracking.
 * Strictly permits only standard http:// and https:// protocols.
 * Rejects unsafe protocols (javascript:, data:, file:, mailto:, tel:) and relative/fragment URLs.
 */
export function isEligibleForClickTracking(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') {
    return false;
  }

  const trimmed = urlStr.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Rewrites eligible HTML anchor tags in email content for click tracking.
 * Preserves anchor attributes, inner text/HTML, and query parameters.
 * Idempotent: Skips links that are already routed through the tracking endpoint.
 */
export function rewriteHtmlLinks(html: string, trackingToken: string, baseUrl: string): string {
  if (!html || !trackingToken) {
    return html;
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const trackingEndpointPrefix = `${cleanBaseUrl}/api/track/click/`;

  // Matches <a> tags with href attribute (supporting single or double quotes)
  const anchorRegex = /<a\b([^>]*?)\bhref=(["'])(.*?)\2([^>]*?)>/gi;

  return html.replace(anchorRegex, (match, beforeHref, quote, originalHref, afterHref) => {
    const trimmedHref = originalHref.trim();

    // Idempotency: Skip if link is already tracked
    if (trimmedHref.startsWith(trackingEndpointPrefix) || trimmedHref.includes('/api/track/click/')) {
      return match;
    }

    // Protocol check: Only rewrite http:// and https:// links
    if (!isEligibleForClickTracking(trimmedHref)) {
      return match;
    }

    const encodedTarget = encodeURIComponent(trimmedHref);
    const trackedUrl = `${cleanBaseUrl}/api/track/click/${encodeURIComponent(trackingToken)}?url=${encodedTarget}`;

    return `<a${beforeHref}href=${quote}${trackedUrl}${quote}${afterHref}>`;
  });
}

/**
 * Injects a 1x1 transparent open-tracking pixel into HTML email content.
 * Inserts immediately before </body> if present; otherwise appends to the end.
 * Idempotent: Does not inject duplicate pixels if one already exists.
 */
export function injectOpenTrackingPixel(html: string, trackingToken: string, baseUrl: string): string {
  if (!html || !trackingToken) {
    return html;
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const openEndpointPrefix = `${cleanBaseUrl}/api/track/open/`;

  // Idempotency: Avoid duplicate tracking pixel injection
  if (html.includes(openEndpointPrefix) || html.includes('/api/track/open/')) {
    return html;
  }

  const pixelImg = `<img src="${cleanBaseUrl}/api/track/open/${encodeURIComponent(trackingToken)}" width="1" height="1" style="display:none" alt="" />`;

  const bodyCloseRegex = /(<\/body\s*>)/i;
  if (bodyCloseRegex.test(html)) {
    return html.replace(bodyCloseRegex, `${pixelImg}$1`);
  }

  return `${html}${pixelImg}`;
}

/**
 * Main email HTML instrumentation function.
 * Coordinates open pixel injection and click link rewriting.
 * Returns unmodified input for plain text or empty content.
 */
export function instrumentEmailHtml(
  html: string | null | undefined,
  trackingToken: string,
  options?: InstrumentOptions
): string | null | undefined {
  if (html === null || html === undefined || html.trim() === '') {
    return html;
  }

  if (!trackingToken || typeof trackingToken !== 'string' || trackingToken.trim() === '') {
    throw new Error('Tracking token is required for email HTML instrumentation');
  }

  const effectiveBaseUrl = (options?.baseUrl || config.BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');

  // Step 1: Rewrite eligible anchor links
  const htmlWithTrackedLinks = rewriteHtmlLinks(html, trackingToken.trim(), effectiveBaseUrl);

  // Step 2: Inject open tracking pixel
  const instrumentedHtml = injectOpenTrackingPixel(htmlWithTrackedLinks, trackingToken.trim(), effectiveBaseUrl);

  return instrumentedHtml;
}
