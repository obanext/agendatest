import fs from "node:fs";
import path from "node:path";
import { BRANCHES } from "./vestigingen.js";

const WHEN_VALUES = ["b_thisweek", "c_nextweek"];
const PAGE_SIZE = 20;

function slug(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function decodeXml(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parsePage(xml) {
  const countMatch = xml.match(/<count>(\d+)<\/count>/);
  const count = countMatch ? parseInt(countMatch[1], 10) : null;
  const results = [];
  const parts = xml.split("<result>").slice(1);

  for (const part of parts) {
    const block = part.split("</result>")[0];
    const idMatch = block.match(/<id[^>]*>([^<]+)<\/id>/);
    const titleMatch =
      block.match(/<titles>\s*<title[^>]*>([\s\S]*?)<\/title>/) ||
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const locMatch = block.match(/<locatienaam>([^<]*)<\/locatienaam>/);
    const dateMatch = block.match(/<datum[^>]*start="([^"]+)"/);

    const id = idMatch ? decodeXml(idMatch[1].trim()) : "";
    const title = titleMatch ? decodeXml(titleMatch[1].trim()) : "";
    const location = locMatch ? decodeXml(locMatch[1].trim()) : "";
    const start = dateMatch ? dateMatch[1].trim() : null;
    if (!start) continue;

    results.push({ id, title, location, start });
  }

  return { count, results };
}

async function fetchPage(branchName, when, page) {
  const key = process.env.OBA_API_KEY;
  if (!key) throw new Error("Missing OBA_API_KEY");

  const facet = `/root/OBA/${branchName}`;
  const url =
    `https://zoeken.oba.nl/api/v1/search/?q=table:evenementen` +
    `&refine=true&authorization=${key}` +
    `&facet=Wanneer(${when})&branch=${encodeURIComponent(facet)}` +
    `&page=${page}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OBA request failed ${res.status}`);
  return parsePage(await res.text());
}

export async function runFullSync() {
  const outDir = path.join(process.cwd(), "public", "data");
  fs.mkdirSync(outDir, { recursive: true });

  for (const branch of BRANCHES) {
    const items = [];
    const counts = { b_thisweek: 0, c_nextweek: 0 };
    let error = null;

    for (const when of WHEN_VALUES) {
      try {
        let page = 1;
        let totalPages = 1;
        let firstCount = null;

        while (page <= totalPages) {
          const { count, results } = await fetchPage(branch, when, page);
          if (page === 1 && count != null) {
            firstCount = count;
            totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
          }
          for (const r of results) items.push({ ...r, week: when, branch });
          page++;
        }

        counts[when] = firstCount ?? items.filter(i => i.week === when).length;
      } catch (e) {
        error = String(e.message || e);
      }
    }

    items.sort((a, b) => new Date(a.start) - new Date(b.start));

    const payload = {
      branch,
      lastSync: Date.now(),
      total: items.length,
      pages: items.length > 0 ? Math.ceil(items.length / 8) : 0,
      items,
      counts,
      error
    };

    fs.writeFileSync(
      path.join(outDir, `${slug(branch)}.json`),
      JSON.stringify(payload)
    );
  }
}
