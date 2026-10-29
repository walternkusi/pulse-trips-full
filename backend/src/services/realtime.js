// =============================================================================
// REAL-TIME UPDATES (Server-Sent Events)
// Every open tour page keeps one lightweight connection to
// GET /api/availability/stream?slug=... . Whenever seats change (booking,
// cancellation, expired hold, reschedule) we push a small "changed" message
// and the browser re-fetches availability. Visitors never see stale seat counts.
//
// SSE is plain HTTP, works through most proxies and needs no extra library.
// If you scale to several servers, broadcast through Redis pub/sub instead.
// =============================================================================

const clients = new Set(); // { res, slug }

// Registers a browser connection. Called by the route handler.
export function subscribe(req, res, slug) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // tell nginx not to buffer the stream
  });
  res.flushHeaders();
  res.write('retry: 5000\n\n'); // browser reconnects after 5 s if the connection drops

  const client = { res, slug };
  clients.add(client);

  // Heartbeat comment every 25 s keeps idle connections open behind load balancers.
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(client); });
}

// Tells every page viewing `slug` that a departure changed.
export function publishAvailability(slug, date, time) {
  const data = JSON.stringify({ slug, date, time, at: Date.now() });
  for (const c of clients) {
    if (c.slug === slug) c.res.write(`event: availability\ndata: ${data}\n\n`);
  }
}
