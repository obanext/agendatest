export default async function handler(req, res) {
  const key = process.env.OBA_API_KEY;
  const { when = "b_thisweek", where = "" } = req.query;

  const wanneerFacet = `Wanneer(${when})`;
  const branchParam = where !== "" ? `&branch=${encodeURIComponent(where)}` : "";

  const base = `https://zoeken.oba.nl/api/v1/search/?q=table:evenementen&refine=true&authorization=${key}&facet=${wanneerFacet}${branchParam}&sort=evt_dt_asc&page=`;

  const res1 = await fetch(base + "1");
  const xmlText1 = await res1.text();
  const xml1 = new DOMParser().parseFromString(xmlText1, "application/xml");

  const total = parseInt(xml1.querySelector("count")?.textContent || "0", 10);
  const pagesNeeded = Math.ceil(total / 20);

  let allResults = [...xml1.querySelectorAll("result")];

  for (let p = 2; p <= pagesNeeded; p++) {
    const resp = await fetch(base + p);
    const xmlText = await resp.text();
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    xml.querySelectorAll("result").forEach(r => allResults.push(r));
  }

  allResults.sort((a, b) => {
    const da = new Date(a.querySelector("datum").getAttribute("start"));
    const db = new Date(b.querySelector("datum").getAttribute("start"));
    return da - db;
  });

  const wrapper =
    `<aquabrowser><results>${allResults.map(n => n.outerHTML).join("")}</results></aquabrowser>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(wrapper);
}
