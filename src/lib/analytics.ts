/**
 * Umami analytics (cookieless). The script is only on production builds (Layout.astro)
 * and only counts on yogifm.com (`data-domains`). Auto-tracking is off because the
 * player rewrites the URL hash on every track change; page views are sent here on each
 * navigation, without the hash. See documentation/deployment.md.
 *
 * Never send personal data: only page paths and what's playing.
 */
type Umami = { track: (...args: unknown[]) => void };

declare global {
  interface Window {
    umami?: Umami;
  }
}

const queue: Array<() => void> = [];
let waiting = false;

/** The script loads with `defer` (and may be blocked); queue calls until it's there. */
function whenReady(call: () => void) {
  if (!import.meta.env.PROD) return;
  if (window.umami) {
    try {
      call();
    } catch {
      // Analytics must never break the player.
    }
    return;
  }
  if (queue.length < 50) queue.push(call);
  if (waiting) return;
  waiting = true;
  const timer = window.setInterval(() => {
    if (!window.umami) return;
    window.clearInterval(timer);
    waiting = false;
    for (const queued of queue.splice(0)) {
      try {
        queued();
      } catch {
        // Ignore.
      }
    }
  }, 500);
  // Blocked by an ad blocker, or offline: stop checking.
  window.setTimeout(() => {
    window.clearInterval(timer);
    waiting = false;
  }, 20_000);
}

/** One page view for the current page (path + query, no #hash). */
export function trackPageview() {
  const url = `${location.pathname}${location.search}`;
  const title = document.title;
  whenReady(() => window.umami!.track((props: Record<string, unknown>) => ({ ...props, url, title })));
}

export function trackEvent(name: string, data?: Record<string, string | number>) {
  whenReady(() => window.umami!.track(name, data));
}
