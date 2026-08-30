import { describe, it, expect } from 'vitest';
import {
  instrumentEmailHtml,
  rewriteHtmlLinks,
  injectOpenTrackingPixel,
  isEligibleForClickTracking
} from '../src/tracking/email.instrumenter.js';

describe('Email HTML Instrumentation Tests (Phase 3)', () => {
  const sampleToken = 'd3b07384-d113-4632-a5e2-63b7238b9750';
  const customBaseUrl = 'https://outreach.example.com';

  describe('isEligibleForClickTracking() Security Tests', () => {
    it('should allow valid http and https URLs', () => {
      expect(isEligibleForClickTracking('https://reachinbox.ai')).toBe(true);
      expect(isEligibleForClickTracking('http://example.com/demo?q=1&b=2#sec')).toBe(true);
      expect(isEligibleForClickTracking('https://sub.domain.co.uk:8080/path/to/page')).toBe(true);
    });

    it('should reject unsafe and non-http(s) URL schemes', () => {
      expect(isEligibleForClickTracking('javascript:alert(document.cookie)')).toBe(false);
      expect(isEligibleForClickTracking('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isEligibleForClickTracking('file:///etc/passwd')).toBe(false);
      expect(isEligibleForClickTracking('mailto:support@reachinbox.ai')).toBe(false);
      expect(isEligibleForClickTracking('tel:+1234567890')).toBe(false);
      expect(isEligibleForClickTracking('about:blank')).toBe(false);
      expect(isEligibleForClickTracking('vbscript:msgbox(1)')).toBe(false);
    });

    it('should reject relative and fragment-only URLs', () => {
      expect(isEligibleForClickTracking('/pricing')).toBe(false);
      expect(isEligibleForClickTracking('#top')).toBe(false);
      expect(isEligibleForClickTracking('//cdn.example.com/script.js')).toBe(false);
      expect(isEligibleForClickTracking('')).toBe(false);
    });
  });

  describe('Open Tracking Pixel Injection', () => {
    it('should inject a 1x1 tracking pixel immediately before </body> tag', () => {
      const html = '<html><body><h1>Hello</h1><p>Welcome!</p></body></html>';
      const result = injectOpenTrackingPixel(html, sampleToken, customBaseUrl);

      expect(result).toContain(
        `<img src="https://outreach.example.com/api/track/open/${sampleToken}" width="1" height="1" style="display:none" alt="" /></body>`
      );
    });

    it('should append tracking pixel to end if no </body> tag is present', () => {
      const html = '<div><h1>Hello</h1><p>Snippet content</p></div>';
      const result = injectOpenTrackingPixel(html, sampleToken, customBaseUrl);

      expect(result.endsWith(
        `<img src="https://outreach.example.com/api/track/open/${sampleToken}" width="1" height="1" style="display:none" alt="" />`
      )).toBe(true);
    });

    it('should be idempotent and never inject duplicate open tracking pixels', () => {
      const html = '<html><body><p>Hello</p></body></html>';
      const once = injectOpenTrackingPixel(html, sampleToken, customBaseUrl);
      const twice = injectOpenTrackingPixel(once, sampleToken, customBaseUrl);

      const occurrences = (twice.match(/\/api\/track\/open\//g) || []).length;
      expect(occurrences).toBe(1);
      expect(twice).toBe(once);
    });
  });

  describe('Click Tracking Link Rewriting', () => {
    it('should rewrite valid https and http anchor hrefs', () => {
      const html = '<p>Check <a href="https://reachinbox.ai">ReachInbox</a> and <a href="http://example.com/docs">Docs</a>.</p>';
      const result = rewriteHtmlLinks(html, sampleToken, customBaseUrl);

      expect(result).toContain(
        `href="https://outreach.example.com/api/track/click/${sampleToken}?url=https%3A%2F%2Freachinbox.ai"`
      );
      expect(result).toContain(
        `href="https://outreach.example.com/api/track/click/${sampleToken}?url=http%3A%2F%2Fexample.com%2Fdocs"`
      );
    });

    it('should preserve anchor attributes (target, class, style, rel) and inner text', () => {
      const html = '<a href="https://example.com/demo" target="_blank" rel="noopener noreferrer" class="btn primary" style="color: blue;">Schedule Demo</a>';
      const result = rewriteHtmlLinks(html, sampleToken, customBaseUrl);

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('class="btn primary"');
      expect(result).toContain('style="color: blue;"');
      expect(result).toContain('>Schedule Demo</a>');
      expect(result).toContain(`url=https%3A%2F%2Fexample.com%2Fdemo`);
    });

    it('should preserve query parameters and URL fragments in destination URL', () => {
      const html = '<a href="https://example.com/signup?ref=outreach&utm_source=email#step2">Sign Up</a>';
      const result = rewriteHtmlLinks(html, sampleToken, customBaseUrl);

      const expectedTarget = encodeURIComponent('https://example.com/signup?ref=outreach&utm_source=email#step2');
      expect(result).toContain(`url=${expectedTarget}`);
    });

    it('should NOT rewrite unsafe or excluded link schemes', () => {
      const html = `
        <a href="javascript:alert('pwned')">Evil</a>
        <a href="mailto:sales@example.com">Email Us</a>
        <a href="tel:+18005550199">Call Us</a>
        <a href="data:text/html,bad">Data</a>
        <a href="#section-top">Jump to top</a>
      `;
      const result = rewriteHtmlLinks(html, sampleToken, customBaseUrl);

      expect(result).toContain('href="javascript:alert(\'pwned\')"');
      expect(result).toContain('href="mailto:sales@example.com"');
      expect(result).toContain('href="tel:+18005550199"');
      expect(result).toContain('href="data:text/html,bad"');
      expect(result).toContain('href="#section-top"');
    });

    it('should be idempotent and not double-wrap already tracked links', () => {
      const html = '<p>Visit <a href="https://example.com">Site</a></p>';
      const once = rewriteHtmlLinks(html, sampleToken, customBaseUrl);
      const twice = rewriteHtmlLinks(once, sampleToken, customBaseUrl);

      const occurrences = (twice.match(/\/api\/track\/click\//g) || []).length;
      expect(occurrences).toBe(1);
      expect(twice).toBe(once);
    });
  });

  describe('instrumentEmailHtml() Full Pipeline Integration', () => {
    it('should execute both link rewriting and pixel injection in full HTML email', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Outreach</title></head>
          <body>
            <h2>Exclusive Offer</h2>
            <p>Please visit <a href="https://example.com/deal">our special deal</a>.</p>
            <p>Questions? <a href="mailto:help@example.com">Email support</a></p>
          </body>
        </html>
      `;

      const result = instrumentEmailHtml(html, sampleToken, { baseUrl: customBaseUrl });
      expect(result).toBeDefined();

      // Check click tracking on valid link
      expect(result).toContain(`href="https://outreach.example.com/api/track/click/${sampleToken}?url=https%3A%2F%2Fexample.com%2Fdeal"`);
      // Check mailto remains untouched
      expect(result).toContain('href="mailto:help@example.com"');
      // Check pixel injected before </body>
      expect(result).toContain(`<img src="https://outreach.example.com/api/track/open/${sampleToken}" width="1" height="1" style="display:none" alt="" /></body>`);
    });

    it('should leave plain text or null/undefined/empty input untouched', () => {
      expect(instrumentEmailHtml(null, sampleToken)).toBeNull();
      expect(instrumentEmailHtml(undefined, sampleToken)).toBeUndefined();
      expect(instrumentEmailHtml('', sampleToken)).toBe('');
    });

    it('should throw an error if tracking token is missing', () => {
      expect(() => {
        instrumentEmailHtml('<p>Hello</p>', '');
      }).toThrow('Tracking token is required');
    });

    it('should be fully idempotent when called repeatedly', () => {
      const html = '<html><body><a href="https://reachinbox.ai">Link</a></body></html>';
      const step1 = instrumentEmailHtml(html, sampleToken, { baseUrl: customBaseUrl });
      const step2 = instrumentEmailHtml(step1, sampleToken, { baseUrl: customBaseUrl });

      expect(step2).toBe(step1);
    });
  });
});
