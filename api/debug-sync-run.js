import { BRANCHES } from "../lib/vestigingen.js";

export default async function handler(req, res) {
  try {
    const key = process.env.OBA_API_KEY;
    if (!key) {
      res.status(500).json({ error: "Missing OBA_API_KEY" });
      return;
    }

    const firstBranch = BRANCHES[0];
    const when = "b_thisweek";
    const facet = `/root/OBA/${firstBranch}`;
    const facetParam = `&branch=${encodeURIComponent(facet)}`;
    const wanneerFacet = `Wanneer(${when})`;

    const url = `https://zoeken.oba.nl/api/v1/search/?q=table:evenementen&refine=true&authorization=${key}&facet=${wanneerFacet}${facetParam}&page=1`;

    const r = await fetch(url);
    const text = await r.text();

    res.status(200).json({
      ok: true,
      status: r.status,
      branch: firstBranch,
      url,
      bodyStart: text.slice(0, 500)
    });

  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
