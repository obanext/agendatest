import { getAgendaForBranch } from "../lib/sync.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }
  const where = req.query.where;
  if (!where) {
    res.status(400).json({ error: "Missing where parameter" });
    return;
  }
  try {
    const data = await getAgendaForBranch(where);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Kan data niet ophalen" });
  }
}
