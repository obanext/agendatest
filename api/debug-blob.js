import { list } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    const blobs = await list();
    res.status(200).json({ blobs });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
