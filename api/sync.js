import { runFullSync } from "../lib/sync.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).end();
    return;
  }
  try {
    const cache = await runFullSync();
    res.status(200).json({
      ok: true,
      lastSync: cache.lastSync,
      branches: Object.fromEntries(
        Object.entries(cache.branches).map(([name, b]) => [
          name,
          {
            thisweek: b.counts.b_thisweek || 0,
            nextweek: b.counts.c_nextweek || 0,
            total: b.items.length,
            error: b.error || null
          }
        ])
      )
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
