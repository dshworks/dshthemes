#!/usr/bin/env node
// Photograph the shell wearing each theme.
//
// The gallery's problem was never that themes are ugly, it is that most of them
// have no picture. The painted signature solved half of it — six colours in a
// dsh-shaped frame — but a signature is a swatch, not a look. Once each theme's
// stylesheet is frozen into the build (scripts/enrich.mjs), the rest is
// mechanical: serve dist/, open the preview at desktop size, and take the
// picture ourselves.
//
// It also answers a question no static check can. A stylesheet that passes the
// "touches the shell" gate might still change nothing visible. Every render is
// compared against the stock shell, and a theme that comes back identical loses
// its live claim instead of showing a reader the stock UI with its name on it.
//
//   node scripts/shots.mjs               # only themes with no current shot
//   node scripts/shots.mjs --force       # re-shoot everything
//   node scripts/shots.mjs --only=slug   # one theme, repeatable
//   node scripts/shots.mjs --limit=20
//
// Needs `npm run build` first and a Chromium (cloakbrowser in this container).
// data/shots.json + data/shots/*.webp are committed, so a build on a machine
// with no browser still ships the pictures.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const OUT_DIR = join(ROOT, "data", "shots");
const OUT_JSON = join(ROOT, "data", "shots.json");
// Locally this is cloakbrowser (the container's Chromium). On CI there is no
// cloakbrowser and no need for one, so the same script falls back to
// playwright-core driving the runner's installed Chrome. The two APIs agree on
// everything used below.
const CLOAK = process.env.CLOAK_APP_DIR || "/opt/cloak";
const PORT = Number(process.env.SHOTS_PORT || 8138);
const PAGES = Number(process.env.SHOTS_CONCURRENCY || 4);

// The stage is 16/10 and the shell is a desktop layout; 1440x900 is both.
const SHELL = { width: 1440, height: 900 };
// Shipped at 2x the widest a card is ever drawn, which is the theme page stage.
const SHIP = { width: 1200, height: 750 };

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (argv.find((a) => a.startsWith(`--${n}=`)) || "=").split("=")[1] || d;
const FORCE = flag("force");
const ONLY = argv.filter((a) => a.startsWith("--only=")).map((a) => a.slice(7));
const LIMIT = Number(opt("limit", Infinity));

if (!existsSync(join(DIST, "preview", "index.html"))) throw new Error("run `npm run build` first");

const registry = JSON.parse(readFileSync(join(ROOT, "data", "themes.json"), "utf8"));
const enrich = JSON.parse(readFileSync(join(ROOT, "data", "enrich.json"), "utf8"));
const previous = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, "utf8")) : { updated: null, stock: null, shots: {} };
const today = new Date().toISOString().slice(0, 10);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// A theme that leads light is photographed light. Rendering a parchment skin
// on the dark shell says nothing true about it.
const leadsOf = (repo) => (enrich.repos[repo]?.palette?.leads === "light" ? "light" : "dark");

const targets = registry.themes
  .map((t) => ({ ...t, slug: slugify(t.name), scheme: leadsOf(t.repo), render: enrich.repos[t.repo]?.render || null }))
  .filter((t) => t.render?.file)
  .filter((t) => (ONLY.length ? ONLY.includes(t.slug) : true))
  .filter((t) => {
    if (FORCE || ONLY.length) return true;
    const had = previous.shots[t.repo];
    return !had || had.sheet !== t.render.file || had.fetchedAt !== enrich.repos[t.repo].fetchedAt || had.scheme !== t.scheme;
  })
  .slice(0, LIMIT);

console.error(`shots: ${targets.length} to render (${registry.themes.filter((t) => enrich.repos[t.repo]?.render?.file).length} renderable in all)`);
if (!targets.length && !FORCE) { console.error("shots: nothing to do"); process.exit(0); }

mkdirSync(OUT_DIR, { recursive: true });
const staging = join(tmpdir(), `dshthemes-shots-${process.pid}`);
mkdirSync(staging, { recursive: true });

// --- serve dist/ -------------------------------------------------------------
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: DIST, stdio: "ignore" });
const stop = () => { try { server.kill(); } catch {} };
process.on("exit", stop);
process.on("SIGINT", () => { stop(); process.exit(130); });
await new Promise((r) => setTimeout(r, 900));

// --- render ------------------------------------------------------------------
// The browser runs out of /opt/cloak (where cloakbrowser is installed) and is
// handed a plain list of jobs, so nothing in this file has to be importable
// from there.
const jobs = [
  { name: "__stock__dark", url: `http://127.0.0.1:${PORT}/preview/?scheme=dark&embed=1` },
  { name: "__stock__light", url: `http://127.0.0.1:${PORT}/preview/?scheme=light&embed=1` },
  ...targets.map((t) => ({ name: t.repo.replace(/[^a-zA-Z0-9._-]+/g, "__"), url: `http://127.0.0.1:${PORT}/preview/?theme=${encodeURIComponent(t.slug)}&scheme=${t.scheme}&embed=1` })),
];

const script = `
let launch;
try {
  ({ launch } = await import('cloakbrowser'));
} catch {
  const pw = await import('playwright-core');
  launch = (opts) => pw.chromium.launch({ ...opts, channel: process.env.CHROME_CHANNEL || 'chrome' });
}
const jobs = ${JSON.stringify(jobs)};
const dir = ${JSON.stringify(staging)};
const browser = await launch({ headless: true });
const queue = [...jobs];
let done = 0;
async function worker() {
  const page = await browser.newPage({ viewport: ${JSON.stringify(SHELL)}, deviceScaleFactor: 1 });
  while (queue.length) {
    const job = queue.shift();
    try {
      // networkidle is the right target and the wrong failure mode. A theme
      // whose sheet pulls fonts and background images off raw.githubusercontent
      // -- 15 of them, in one case -- never reaches idle when that host is slow,
      // and the whole render is thrown away for a picture that would have been
      // fine without the webfont. Fall back to 'load' and let the settle below
      // do its work: a shot missing a remote font still shows the theme, and
      // the pixel-diff gate downstream still decides whether it is live.
      try {
        await page.goto(job.url, { waitUntil: 'networkidle', timeout: 25000 });
      } catch (err) {
        if (!/Timeout/i.test(err && err.message || '')) throw err;
        console.error('SLOW ' + job.name + ' (never reached network idle; shooting on load)');
        await page.goto(job.url, { waitUntil: 'load', timeout: 25000 });
      }
      // The preview injects the sheet after fetching it; wait for the tag or
      // for the page to say it failed, then let fonts and images settle.
      await page.waitForFunction(
        () => document.querySelector('style[data-preview-override]') || !document.getElementById('live-note')?.hidden || !window.__PREVIEW__ ,
        { timeout: 12000 },
      ).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(450);
      await page.screenshot({ path: dir + '/' + job.name + '.png', type: 'png' });
    } catch (err) {
      console.error('FAIL ' + job.name + ' ' + (err && err.message));
    }
    if (++done % 20 === 0) console.error('  ' + done + '/' + jobs.length);
  }
  await page.close();
}
await Promise.all(Array.from({ length: ${PAGES} }, worker));
await browser.close();
console.error('rendered ' + done);
`;

const code = await new Promise((resolve) => {
  const child = spawn("node", ["--input-type=module", "-e", script], {
    cwd: existsSync(join(CLOAK, "node_modules", "cloakbrowser")) ? CLOAK : ROOT, stdio: "inherit",
    env: { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" },
  });
  child.on("exit", (c) => resolve(c ?? 1));
});
stop();
if (code !== 0) throw new Error(`browser exited ${code}`);

// --- compare, shrink, keep ---------------------------------------------------
// The stock shell is the control. A render that hashes to the same pixels wore
// its stylesheet and came back unchanged, which is a fact about the theme worth
// recording, not a picture worth shipping.
const stock = {};
for (const scheme of ["dark", "light"]) {
  const p = join(staging, `__stock__${scheme}.png`);
  if (!existsSync(p)) throw new Error(`the stock ${scheme} shell did not render — the comparison has no control`);
  stock[scheme] = await pixelHash(p);
}

const shots = { ...previous.shots };
// `same` counts observations, `dropped` counts state changes, and only the
// second is news. A re-shoot of 162 themes reported "50 identical to the stock
// shell (live claim dropped)" when the live count moved by one -- the other 49
// had matched stock on their previous run too and were already recorded that
// way. A tally that reads as an event when it is a restatement is the same
// species of wrong as a chart corrected by its caption.
let kept = 0, same = 0, dropped = 0, missing = 0;
for (const t of targets) {
  const name = t.repo.replace(/[^a-zA-Z0-9._-]+/g, "__");
  const png = join(staging, `${name}.png`);
  if (!existsSync(png)) { missing++; delete shots[t.repo]; continue; }
  const hash = await pixelHash(png);
  if (hash === stock[t.scheme]) {
    same++;
    if (previous.shots[t.repo] && previous.shots[t.repo].same !== true) dropped++;
    shots[t.repo] = { same: true, scheme: t.scheme, sheet: t.render.file, fetchedAt: enrich.repos[t.repo].fetchedAt, shot: today };
    const stale = join(OUT_DIR, `${name}.webp`);
    if (existsSync(stale)) rmSync(stale);
    continue;
  }
  const file = `${name}.webp`;
  const info = await sharp(png).resize(SHIP.width, SHIP.height, { fit: "cover" }).webp({ quality: 76, effort: 5 }).toFile(join(OUT_DIR, file));
  shots[t.repo] = { same: false, scheme: t.scheme, file, bytes: info.size, sheet: t.render.file, fetchedAt: enrich.repos[t.repo].fetchedAt, shot: today };
  kept++;
}

// Drop rows for themes that left the registry or lost their sheet.
const liveRepos = new Set(registry.themes.filter((t) => enrich.repos[t.repo]?.render?.file).map((t) => t.repo));
for (const repo of Object.keys(shots)) if (!liveRepos.has(repo)) delete shots[repo];
const wanted = new Set(Object.values(shots).map((s) => s.file).filter(Boolean));
for (const f of readdirSync(OUT_DIR)) if (f.endsWith(".webp") && !wanted.has(f)) rmSync(join(OUT_DIR, f));

writeFileSync(OUT_JSON, `${JSON.stringify({ updated: today, stock, shell: SHELL, ship: SHIP, shots }, null, 1)}\n`);
rmSync(staging, { recursive: true, force: true });

const bytes = Object.values(shots).reduce((n, s) => n + (s.bytes || 0), 0);
console.error(`shots: ${kept} kept, ${same} identical to the stock shell (${dropped} newly, the rest already recorded that way), ${missing} failed to render`);
console.error(`shots: ${Object.values(shots).filter((s) => s.file).length} pictures, ${(bytes / 1e6).toFixed(1)} MB total`);

// Raw pixels, not the PNG bytes: two encodes of the same frame differ.
async function pixelHash(file) {
  const { data } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  return createHash("sha1").update(data).digest("hex");
}
