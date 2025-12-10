import { BRANCHES } from "./vestigingen.js";
import { put, get } from "@vercel/blob";

const CACHE_KEY = "agenda-cache.json";
const WHEN_VALUES = ["b_thisweek", "c_nextweek"];
const PAGE_SIZE = 20;
const SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000;

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

async function loadCacheFromBlob() {
  try {
    const { blob } = await get(CACHE_KEY);
    const text = await blob.text();
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

async function saveCacheToBlob(cache) {
  await put(CACHE_KEY, JSON.stringify(cache), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false
  });
}

function needsSync(cache) {
  if (!cache || !cache.lastSync) return true;
  const age = Date.now() - cache.lastSync;
  return age > SYNC_INTERVAL_MS;
}

function branchFacet(branchName) {
  return `/root/OBA/${branchName}`;
}

async function fetchPage(branchName, when, page) {
  const key = process.env.OBA_API_KEY;
  if (!key) throw new Error("Missing OBA_API_KEY");
  const wanneerFacet = `Wanneer(${when})`;
  const branchParam = `&branch=${encodeURIComponent(branchFacet(branchName))}`;
  const url = `https://zoeken.oba.nl/api/v1/search/?q=table:evenementen&refine=true&authorization=${key}&facet=${wanneerFacet}${branchParam}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OBA request failed ${res.status}`);
  }
  const xml = await res.text();
  return parsePage(xml);
}

async function runFullSync() {
  const branchesData = {};
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
          for (const r of results) {
            items.push({ ...r, week: when, branch });
          }
          page += 1;
        }
        if (firstCount != null) {
          counts[when] = firstCount;
        } else {
          counts[when] = items.filter(i => i.week === when).length;
        }
      } catch (e) {
        error = String(e.message || e);
      }
    }
    items.sort((a, b) => {
      const da = new Date(a.start).getTime();
      const db = new Date(b.start).getTime();
      return da - db;
    });
    branchesData[branch] = {
      items,
      counts,
      error
    };
  }
  const cache = {
    lastSync: Date.now(),
    branches: branchesData
  };
  await saveCacheToBlob(cache);
  return cache;
}

async function ensureCache() {
  const existing = await loadCacheFromBlob();
  if (needsSync(existing)) {
    return await runFullSync();
  }
  return existing;
}

export async function getAgendaForBranch(branchName) {
  const cache = await ensureCache();
  const branch = cache.branches[branchName] || { items: [], counts: { b_thisweek: 0, c_nextweek: 0 }, error: null };
  const total = branch.items.length;
  const pages = total > 0 ? Math.ceil(total / 8) : 0;
  return {
    branch: branchName,
    lastSync: cache.lastSync,
    total,
    pages,
    items: branch.items,
    counts: branch.counts,
    error: branch.error
  };
}

export async function getHealthStatus() {
  const cache = await ensureCache();
  const branches = {};
  for (const name of Object.keys(cache.branches)) {
    const b = cache.branches[name];
    const total = b.items.length;
    branches[name] = {
      thisweek: b.counts.b_thisweek || 0,
      nextweek: b.counts.c_nextweek || 0,
      total,
      error: b.error || null
    };
  }
  return {
    lastSync: cache.lastSync,
    branches
  };
}
