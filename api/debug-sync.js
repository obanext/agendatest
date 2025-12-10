import fs from "node:fs";
import path from "node:path";

export default async function handler(req, res) {
  try {
    const root = process.cwd();
    const libPath = path.join(root, "lib", "sync.js");
    const exists = fs.existsSync(libPath);

    res.status(200).json({
      root,
      libPath,
      exists
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
