import { getHealthStatus } from "../lib/sync.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }
  try {
    const health = await getHealthStatus();
    res.status(200).json(health);
  } catch (err) {
    res.status(500).json({ error: "Kan health data niet ophalen" });
  }
}
