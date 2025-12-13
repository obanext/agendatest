import { runFullSync } from "../lib/sync.js";

export default async function handler(req, res) {
  try {
    await runFullSync();
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
