type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const gtag = (window as AnalyticsWindow).gtag;
  const dataLayer = (window as AnalyticsWindow).dataLayer;
  return typeof gtag === "function" || Array.isArray(dataLayer);
}

/**
 * Fire a GA4 event. No-ops silently when GA is not configured, so events can
 * be added anywhere without guards. Use as: trackEvent("search", { city })
 */
export function trackEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const win = window as AnalyticsWindow;
  const gtag = win.gtag;
  if (typeof gtag !== "function") return;
  gtag("event", event, params);
}