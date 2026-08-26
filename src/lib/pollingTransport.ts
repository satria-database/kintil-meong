/**
 * PollingTransport — mimics the WebSocket interface so the chat hook can use it
 * as a drop-in replacement when WebSocket connections are blocked by the proxy.
 *
 * Lifecycle:
 *   const t = new PollingTransport(roomId, roomName, user);
 *   t.onopen = ...; t.onmessage = ...; t.onclose = ...; t.onerror = ...;
 *   t.connect();          // POST /api/poll/join, then start polling
 *   t.send(dataString);   // POST /api/poll/action (ignores join/ping/leave)
 *   t.close();            // POST /api/poll/leave, stop polling
 */

const POLL_INTERVAL_MS = 1500;

export class PollingTransport {
  readyState: number = 0; // 0 = CONNECTING, 1 = OPEN, 3 = CLOSED

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastSeq = -1;
  private left = false;

  constructor(
    private roomId: string,
    private roomName: string | undefined,
    private user: { id: string; name: string; avatar: string; color: string },
  ) {}

  async connect() {
    try {
      const res = await fetch('/api/poll/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          roomName: this.roomName,
          user: this.user,
        }),
      });

      if (!res.ok) throw new Error(`Join failed: ${res.status}`);

      const roomInit = await res.json();
      this.readyState = 1; // OPEN

      // Emit room_init as the first message (same as WS)
      if (this.onmessage) {
        this.onmessage({ data: JSON.stringify(roomInit) });
      }

      if (this.onopen) this.onopen();

      // Start polling loop
      this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    } catch (err) {
      this.readyState = 3; // CLOSED
      if (this.onerror) this.onerror();
      if (this.onclose) this.onclose();
    }
  }

  private async poll() {
    if (this.readyState !== 1 || this.left) return;
    try {
      const res = await fetch(
        `/api/poll?roomId=${encodeURIComponent(this.roomId)}&since=${this.lastSeq}`,
      );
      if (!res.ok) return;

      const data = await res.json();
      for (const entry of data.events as { seq: number; event: any }[]) {
        if (entry.seq > this.lastSeq) {
          this.lastSeq = entry.seq;
          if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(entry.event) });
          }
        }
      }
    } catch {
      // Transient poll errors are fine — keep trying
    }
  }

  send(data: string) {
    if (this.readyState !== 1) return;

    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    // These are handled differently for polling — skip them
    if (parsed.type === 'join') return;  // already joined in connect()
    if (parsed.type === 'ping') return;  // polling itself is the heartbeat
    if (parsed.type === 'leave') {
      this.close();
      return;
    }

    // All other actions go through the HTTP action endpoint
    fetch('/api/poll/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
    }).catch(() => {});
  }

  close() {
    if (this.left) return;
    this.left = true;
    this.readyState = 3; // CLOSED

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Best-effort leave notification
    fetch('/api/poll/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: this.roomId, userId: this.user.id }),
    }).catch(() => {});

    if (this.onclose) this.onclose();
  }
}
