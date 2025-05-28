export default async function handler(req, res) {
  const key = process.env.OBA_API_KEY;
  const url = `https://zoeken.oba.nl/api/v1/search/?q=%20table:evenementen&refine=true&authorization=${key}&branch=OBA%20Javaplein&facet=Wanneer(b_thisweek)`;

  try {
    const response = await fetch(url);
    const xml = await response.text();

    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).json({ error: "Kan data niet ophalen" });
  }
}
