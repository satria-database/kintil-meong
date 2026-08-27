/**
 * Resolves the WebSocket server URL.
 *
 * Order of precedence:
 * 1. `localStorage["wsUrl"]` — lets users override at runtime without rebuilding.
 * 2. `import.meta.env.VITE_WS_URL` — set at build time (e.g. in GitHub Pages deploy).
 * 3. Same origin as the current page — the default for local dev / single-origin deploys.
 *
 * This is needed because static hosts (e.g. GitHub Pages) serve the frontend
 * but have no WebSocket server, so the chat would otherwise stay stuck on
 * "Menghubungkan..." forever.
 */
export function resolveWsUrl(): string {
  // Runtime override (highest priority)
  try {
    const override = localStorage.getItem('wsUrl');
    if (override) return override.replace(/\/$/, '');
  } catch {
    // localStorage may be unavailable (private mode etc.) — ignore
  }

  // Build-time override
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');

  // Default: same origin as the page
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
