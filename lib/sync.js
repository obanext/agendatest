import { BRANCHES } from "./vestigingen.js";
import { put, list } from "@vercel/blob";

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

export async function loadCacheFromBlob() {
  try {
    const blobs = await list({ prefix: CACHE_KEY });
    if (!blobs.blobs.length) return null;
    const url = blobs.blobs[0].url;
    const res = await fetch(url);
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveCacheToBlob(cache) {
  await put(CACHE_KEY, JSON.stringify(cache), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false
  });
}

function needsSync(cache) {
  if (!cache || !cache.lastSync) return true;
  return Date.now() - cache.lastSync > SYNC_INTERVAL_MS;
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
  if (!res.ok) throw new Error(`OBA request failed ${res.status}`);
  const xml = await res.text();
  return parsePage(xml);
}

export async function runFullSync() {
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
        counts[when] =
          firstCount != null
            ? firstCount
            : items.filter(i => i.week === when).length;
      } catch (e) {
        error = String(e.message || e);
      }
    }
    items.sort((a, b) => new Date(a.start) - new Date(b.start));
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
  const branch =
    (cache && cache.branches && cache.branches[branchName]) ||
    { items: [], counts: { b_thisweek: 0, c_nextweek: 0 }, error: null };
  const total = branch.items.length;
  const pages = total > 0 ? Math.ceil(total / 8) : 0;
  return {
    branch: branchName,
    lastSync: cache ? cache.lastSync : null,
    total,
    pages,
    items: branch.items,
    counts: branch.counts,
    error: branch.error
  };
}

export async function getHealthStatusFromCacheOnly() {
  const cache = await loadCacheFromBlob();
  if (!cache || !cache.branches) {
    return {
      lastSync: null,
      branches: {}
    };
  }
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
