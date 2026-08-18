#!/usr/bin/env node
// Enrich the registry with facts the registry does not carry: stars and last
// push (GraphQL, batched), and a colour signature derived from each theme's
// own stylesheet (one tree listing per repo, then raw fetches that cost no
// API budget). Results are cached in data/enrich.json keyed by repo, and a
// repo is only re-read when its cache entry is older than --max-age days
// (default 7) or --force is given. Stars are refreshed on every run.
//
//   node scripts/enrich.mjs            # incremental
//   node scripts/enrich.mjs --force    # re-read every repo's CSS
//
// Needs `gh` auth or GITHUB_TOKEN. Registry comes from data/themes.json
// (run scripts/registry.mjs first).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractPalette } from "./palette.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REG = join(ROOT, "data", "themes.json");
const OUT = join(ROOT, "data", "enrich.json");
const VENDOR = join(ROOT, "src", "vendor", "dsh-client-ui-theme@0.1.0-rc.6");
const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const MAX_AGE_DAYS = Number((process.argv.find((a) => a.startsWith("--max-age=")) || "").split("=")[1] || 7);
const CONCURRENCY = 8;

const registry = JSON.parse(readFileSync(REG, "utf8"));
const cache = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { updated: null, repos: {} };
const today = new Date().toISOString().slice(0, 10);
const BASE_SHEETS = ["base.css", "design-platform.css"].map((f) => readFileSync(join(VENDOR, f), "utf8"));

const token = process.env.GITHUB_TOKEN || (() => {
  try { return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim(); } catch { return ""; }
})();
const ghHeaders = token ? { Authorization: `Bearer ${token}`, "User-Agent": "dshthemes-enrich" } : { "User-Agent": "dshthemes-enrich" };

function gql(query) {
  const out = execFileSync("gh", ["api", "graphql", "-f", `query=${query}`, "--jq", "."], {
    encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(out);
}

// ---- stars / pushedAt / license / homepage, batched -----------------------
const repos = [...new Set(registry.themes.map((t) => t.repo))];
const meta = new Map();
for (let i = 0; i < repos.length; i += 80) {
  const batch = repos.slice(i, i + 80);
  const fields = batch.map((slug, j) => {
    const [owner, name] = slug.split("/");
    return `r${j}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { stargazerCount pushedAt homepageUrl licenseInfo { spdxId } defaultBranchRef { name } }`;
  }).join("\n");
  let res;
  try {
    res = gql(`query {\n${fields}\n}`);
  } catch (err) {
    const text = String(err.stdout || "");
    const start = text.indexOf("{");
    if (start < 0) throw err;
    res = JSON.parse(text.slice(start));
  }
  batch.forEach((slug, j) => {
    const node = res.data?.[`r${j}`];
    if (node) {
      meta.set(slug, {
        stars: node.stargazerCount,
        pushedAt: node.pushedAt?.slice(0, 10) || null,
        homepage: node.homepageUrl || null,
        license: node.licenseInfo?.spdxId && node.licenseInfo.spdxId !== "NOASSERTION" ? node.licenseInfo.spdxId : null,
        branch: node.defaultBranchRef?.name || "HEAD",
      });
    }
  });
}
console.error(`meta: ${meta.size}/${repos.length} repos answered`);

// ---- CSS discovery ---------------------------------------------------------
async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "dshthemes-enrich" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function tree(repo, branch) {
  const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: ghHeaders });
  if (!res.ok) throw new Error(`tree ${res.status} ${repo}`);
  const j = await res.json();
  return { paths: (j.tree || []).filter((n) => n.type === "blob").map((n) => n.path), truncated: Boolean(j.truncated) };
}

const NAME_HINTS = [/theme/i, /skin/i, /dsw/i, /token/i, /palette/i, /color/i, /colour/i, /dark/i, /light/i, /style/i, /index\.css$/i, /main\.css$/i];

// Themes keep their stylesheet in .css, .scss, or — very often for dsh
// plugins — in a TypeScript template string (src/client/style.ts). Rank
// stylesheets first, then style-named code files.
const CODE_HINTS = /style|theme|skin|dsw|token|palette|colou?r|css|client|ui|inject|apply|dark|light/i;
function rankCss(paths, sub) {
  return paths
    .filter((p) => !/node_modules\//.test(p) && !/\.min\.(css|js)$/i.test(p) && !/(^|\/)dist\/.*\.js$/i.test(p))
    .filter((p) => !sub || p.startsWith(sub.replace(/\/?$/, "/")))
    .filter((p) => /\.(css|scss|less|sass)$/i.test(p) || (/\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|json)$/i.test(p) && CODE_HINTS.test(p) && !/package(-lock)?\.json$|tsconfig|\.config\.|\.d\.ts$|lock/i.test(p)))
    .map((p) => {
      let score = 0;
      if (/\.(css|scss|less|sass)$/i.test(p)) score += 3;
      for (const re of NAME_HINTS) if (re.test(p)) score += 2;
      score -= p.split("/").length * 0.5;
      if (/dist\//.test(p)) score -= 1;
      if (/test|spec|example|docs?\//i.test(p)) score -= 1.5;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

function countTokens(css) {
  return (css.match(/--dsw-[a-z0-9-]+["'`]?\s*:/gi) || []).length;
}
function countLiterals(css) {
  return (css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g) || []).length;
}

async function readTheme(t) {
  const m = meta.get(t.repo) || {};
  const branch = m.branch || "HEAD";
  const rawBase = `https://raw.githubusercontent.com/${t.repo}/${branch}/`;
  const entry = { fetchedAt: today, css: null, palette: null, cssCandidates: 0, error: null };

  const candidates = [];
  if (t.previewCss) candidates.push({ url: t.previewCss, path: t.previewCss.replace(/^https?:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\//, ""), curated: true });
  let listing = null;
  try {
    listing = await tree(t.repo, branch);
    const ranked = rankCss(listing.paths, t.path);
    entry.cssCandidates = ranked.length;
    for (const p of ranked.slice(0, 12)) {
      if (!candidates.some((c) => c.path === p)) candidates.push({ url: rawBase + p, path: p, curated: false });
    }
  } catch (err) {
    entry.error = String(err.message || err);
  }

  let best = null;
  for (const c of candidates) {
    let css;
    try { css = await fetchText(c.url); } catch { continue; }
    if (css.length > 2_000_000) continue;
    const tokens = countTokens(css);
    const literals = countLiterals(css);
    const score = tokens * 10 + Math.min(literals, 200) + (c.curated ? 5 : 0);
    if (!best || score > best.score) best = { ...c, css, tokens, literals, score };
    if (c.curated && tokens > 5) break; // the registry already chose; trust it
  }
  if (best) {
    const pal = extractPalette(BASE_SHEETS, best.css);
    entry.css = { url: best.url, path: best.path, tokens: best.tokens, literals: best.literals, curated: best.curated, bytes: best.css.length };
    entry.palette = pal;
  }
  return entry;
}

// --repalette: keep the chosen stylesheet, refetch just it and recompute the
// palette. For when palette.mjs changed and the tree walk did not.
if (args.has("--repalette")) {
  const items = registry.themes.filter((t) => cache.repos[t.repo]?.css?.url);
  let n = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (items.length) {
      const t = items.shift();
      const r = cache.repos[t.repo];
      try {
        const css = await fetchText(r.css.url);
        r.palette = extractPalette(BASE_SHEETS, css);
        r.css.tokens = countTokens(css);
        r.css.literals = countLiterals(css);
      } catch (err) { r.error = String(err.message || err); }
      if (++n % 50 === 0) console.error(`  ${n} repaletted`);
    }
  }));
  cache.updated = today;
  writeFileSync(OUT, JSON.stringify(cache, null, 1) + "\n");
  const all = Object.values(cache.repos);
  const withPal = all.filter((r) => r.palette && r.palette.source);
  console.error(`palettes: ${withPal.length}/${all.length} (${withPal.filter((r) => r.palette.source === "tokens").length} from tokens, ${withPal.filter((r) => r.palette.source === "literals").length} from literals)`);
  process.exit(0);
}

const queue = registry.themes.filter((t) => {
  if (FORCE) return true;
  const c = cache.repos[t.repo];
  if (!c || !c.fetchedAt) return true;
  const age = (Date.parse(today) - Date.parse(c.fetchedAt)) / 86400000;
  return age > MAX_AGE_DAYS;
});
console.error(`css: ${queue.length} of ${registry.themes.length} themes to (re)read`);

let done = 0;
async function worker() {
  while (queue.length) {
    const t = queue.shift();
    let entry;
    try { entry = await readTheme(t); } catch (err) { entry = { fetchedAt: today, css: null, palette: null, error: String(err.message || err) }; }
    cache.repos[t.repo] = { ...(cache.repos[t.repo] || {}), ...entry };
    done++;
    if (done % 25 === 0) console.error(`  ${done} read`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

for (const repo of repos) {
  const m = meta.get(repo);
  if (!m) continue;
  cache.repos[repo] = { ...(cache.repos[repo] || {}), stars: m.stars, pushedAt: m.pushedAt, homepage: m.homepage, ghLicense: m.license, branch: m.branch, starsUpdated: today };
}
cache.updated = today;
writeFileSync(OUT, JSON.stringify(cache, null, 1) + "\n");

const all = Object.values(cache.repos);
const withPal = all.filter((r) => r.palette && r.palette.source);
console.error(`palettes: ${withPal.length}/${all.length} (${withPal.filter((r) => r.palette.source === "tokens").length} from tokens, ${withPal.filter((r) => r.palette.source === "literals").length} from literals)`);
console.error(`wrote ${OUT}`);
