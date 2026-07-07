import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "data");
const TEMPLATE_DIR = path.join(ROOT, "templates");
const PLACEHOLDER = "__AGENDA_DATA__";

function slug(name) {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

function stableBranch(branch) {
  if (!branch || typeof branch !== "object") return null;
  const { lastSync: _lastSync, ...stable } = branch;
  return stable;
}

function safeInlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function readDataFiles() {
  const result = {};
  if (!fs.existsSync(DATA_DIR)) return result;

  for (const filename of fs.readdirSync(DATA_DIR).filter(name => name.endsWith(".json"))) {
    const filePath = path.join(DATA_DIR, filename);
    const branch = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const stable = stableBranch(branch);
    if (!stable?.branch) continue;
    result[slug(stable.branch)] = stable;
  }

  return result;
}

function writeIfChanged(filePath, content) {
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previous === content) return false;
  fs.writeFileSync(filePath, content);
  return true;
}

export function renderPages(dataBySlug = readDataFiles()) {
  const embeddedData = safeInlineJson(dataBySlug);
  let changed = 0;

  for (const name of ["index", "portrait"]) {
    const templatePath = path.join(TEMPLATE_DIR, `${name}.template.html`);
    const outputPath = path.join(ROOT, "public", `${name}.html`);
    const template = fs.readFileSync(templatePath, "utf8");

    if (!template.includes(PLACEHOLDER)) {
      throw new Error(`Placeholder ${PLACEHOLDER} ontbreekt in ${templatePath}`);
    }

    const output = template.replace(PLACEHOLDER, embeddedData);
    if (writeIfChanged(outputPath, output)) changed++;
  }

  console.log(`HTML-render afgerond: ${changed} pagina('s) gewijzigd.`);
  return changed;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) renderPages();
