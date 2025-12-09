export default async function handler(req, res) {
  const key = process.env.OBA_API_KEY;
  const { when = "b_thisweek", where = "" } = req.query;
  const wanneerFacet = `Wanneer(${when})`;
  let branchParam = "";
  if (where !== "") {
    branchParam = `&branch=${encodeURIComponent(where)}`;
  }

  const url = `https://zoeken.oba.nl/api/v1/search/?q=table:evenementen&refine=true&authorization=${key}&facet=${wanneerFacet}${branchParam}&pagesize=8&sort=evt_dt_asc`;

  try {
    const response = await fetch(url);
    const xml = await response.text();
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).json({ error: "Kan data niet ophalen" });
  }
}
