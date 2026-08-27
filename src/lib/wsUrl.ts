/**
 * Resolves the WebSocket server URL.
 *
 * Order of precedence:
 * 1. `localStorage["wsUrl"]` — runtime override (ignored if invalid/unusable).
 * 2. `import.meta.env.VITE_WS_URL` — set at build time (e.g. static deploys).
 * 3. Same origin as the current page — the default for dev / single-origin deploys.
 *
 * Any override is normalized (http→ws, missing `/ws` path appended) and is
 * dropped automatically once it proves unreachable, so a stale value can never
 * leave the room stuck on "Menghubungkan..." on a working domain.
 */
const OVERRIDE_KEY = 'wsUrl';

function sameOriginUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function normalize(raw: string): string | null {
  try {
    const url = new URL(raw.trim(), window.location.href);
    if (url.protocol === 'http:') url.protocol = 'ws:';
    if (url.protocol === 'https:') url.protocol = 'wss:';
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return null;
    // A page served over https cannot open an insecure ws:// socket.
    if (window.location.protocol === 'https:' && url.protocol === 'ws:') return null;
    if (!url.pathname || url.pathname === '/') url.pathname = '/ws';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function readOverride(): string | null {
  try {
    const stored = localStorage.getItem(OVERRIDE_KEY);
    if (stored) return normalize(stored);
  } catch {
    // localStorage may be unavailable (private mode etc.) — ignore
  }
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined;
  return envUrl ? normalize(envUrl) : null;
}

/** Forget a stored override that turned out to be unreachable. */
export function clearWsUrlOverride(): void {
  try {
    localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    // ignore
  }
}

export function resolveWsUrl(): string {
  return readOverride() || sameOriginUrl();
}

export function isUsingWsUrlOverride(): boolean {
  const override = readOverride();
  return !!override && override !== sameOriginUrl();
}
