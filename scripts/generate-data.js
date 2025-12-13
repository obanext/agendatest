import fs from "node:fs";
import path from "node:path";
import { runFullSync } from "../lib/sync.js";

function slug(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

const data = await runFullSync();
const outDir = path.join(process.cwd(), "public", "data");
fs.mkdirSync(outDir, { recursive: true });

for (const branch of Object.values(data)) {
  fs.writeFileSync(
    path.join(outDir, `${slug(branch.branch)}.json`),
    JSON.stringify(branch)
  );
}
