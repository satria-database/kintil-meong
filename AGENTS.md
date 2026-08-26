# Notes

- Single process: `tsx server.ts` runs Express + WebSocket chat server and mounts Vite in middleware mode on port 3000 (no separate frontend port).
- Rooms/messages are in-memory only — restarting the app service wipes all chat state. No database needed.
- `.env.example` mentions `GEMINI_API_KEY` / `APP_URL` (AI Studio leftovers); no code reads them, so no secrets are required to run.
- `vite.config.ts` sets `host: true` + `allowedHosts: true` so the proxied preview hostname is accepted.
- Verify: `curl -H "Host: any.example" http://localhost:3000/` → 200 HTML.
- Server changes require `docker compose -f docker-compose.base44.yml restart app` (tsx has no watcher); frontend edits hot-reload.
