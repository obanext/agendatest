import fs from "node:fs";
import path from "node:path";
import { runFullSync } from "../lib/sync.js";
import { renderPages } from "./render-pages.js";

function slug(name) {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

function withoutLastSync(value) {
  if (!value || typeof value !== "object") return value;
  const { lastSync: _lastSync, ...rest } = value;
  return rest;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

const data = await runFullSync();
const outDir = path.join(process.cwd(), "public", "data");
fs.mkdirSync(outDir, { recursive: true });

let changedFiles = 0;

for (const branch of Object.values(data)) {
  const filePath = path.join(outDir, `${slug(branch.branch)}.json`);
  const previous = readJson(filePath);

  const previousComparable = JSON.stringify(withoutLastSync(previous));
  const nextComparable = JSON.stringify(withoutLastSync(branch));

  if (previousComparable === nextComparable) continue;

  fs.writeFileSync(filePath, JSON.stringify(branch));
  changedFiles++;
}

console.log(`Agenda sync afgerond: ${changedFiles} JSON-bestand(en) inhoudelijk gewijzigd.`);
renderPages();
