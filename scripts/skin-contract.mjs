#!/usr/bin/env node
// Does a skin written for the shell this site renders still match a newer dsh?
//
// The mock shell here is 0.1.0-rc.6 on purpose (see
// content/notes/2026-08-19-why-the-shell-stays-at-rc6.md): skins target two
// things, and only one of them is stable by design.
//
//   1. The --dsw-* tokens. Compared by name and by value, the vendored rc.6
//      sheets under src/vendor/ against the named release's
//      @deepseek-ai/dsh-client-ui-theme. Values are normalised first
//      (rgb() vs hex, #fff vs #ffffff, whitespace), because the newer package
//      ships minified CSS and a notation change is not a design change.
//   2. The hashed CSS-module class names (`.gdEzaW_bubble`). Collected from
//      the compiled `dsh-css:` blocks in every @deepseek-ai/dsh-client-ui-*
//      package the web app depends on, at both releases, and checked against
//      every stylesheet frozen under data/css/.
//
// Usage: node scripts/skin-contract.mjs [to-version]   (default: npm `latest`)
// Needs npm on PATH; fetches ~70 tarballs into a temp dir.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "0.1.0-rc.6";
const VENDOR = join(ROOT, "src", "vendor", `dsh-client-ui-theme@${FROM}`);
const npm = (...args) => execFileSync("npm", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/** Unpack every dsh-client-ui-* package the web app depends on at `v`; returns name -> client.js text. */
function clientUi(v, work) {
  const deps = JSON.parse(npm("view", `@deepseek-ai/dsh-web-app@${v}`, "dependencies", "--json"));
  const out = new Map();
  for (const name of Object.keys(deps).filter((d) => d.startsWith("@deepseek-ai/dsh-client-ui-"))) {
    const dir = join(work, `${name.split("/")[1]}@${v}`);
    const tgz = npm("pack", `${name}@${v}`, "--pack-destination", work).split("\n").at(-1);
    execFileSync("mkdir", ["-p", dir]);
    execFileSync("tar", ["xzf", join(work, tgz), "-C", dir]);
    const f = join(dir, "package", "lib", "client.js");
    if (existsSync(f)) out.set(name.replace("@deepseek-ai/", ""), readFileSync(f, "utf8"));
  }
  return out;
}

/** Hashed module prefixes (`gdEzaW_`) in the compiled CSS strings, -> package. */
function prefixes(pkgs) {
  const out = new Map();
  for (const [pkg, js] of pkgs) {
    for (const m of js.matchAll(/dsh-css:[^\n]*\n[^\n]*?=\s*"((?:[^"\\]|\\.)*)"/g)) {
      for (const c of m[1].matchAll(/\.([A-Za-z0-9_-]{6}_)[A-Za-z]/g)) out.set(c[1], pkg);
    }
  }
  return out;
}

const hex2 = (n) => Math.round(Number(n)).toString(16).padStart(2, "0");
// Colours first, while whitespace still separates them from what follows:
// `#fff 20.19%` with the space stripped reads as the hex `#fff20`.
export const norm = (v) => v.toLowerCase().replace(/"/g, "'")
  .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g, (_, r, g, b, a) =>
    `#${hex2(r)}${hex2(g)}${hex2(b)}${a !== undefined && Number(a) !== 1 ? hex2(Number(a) * 255) : ""}`)
  .replace(/#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])\b/g, "#$1$1$2$2$3$3$4$4")
  .replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/g, "#$1$1$2$2$3$3")
  .replace(/#([0-9a-f]{6})ff\b/g, "#$1")
  .replace(/\btransparent\b/g, "#00000000")
  .replace(/(^|[^\d])0\.(\d)/g, "$1.$2")
  .replace(/\s+/g, "");
/** Every `--dsw-x: value` declaration, as name -> set of normalised values (light and dark both). */
function tokens(css) {
  const out = new Map();
  for (const m of css.matchAll(/(--dsw-[\w-]+)\s*:\s*([^;}]+)/g)) {
    if (!out.has(m[1])) out.set(m[1], new Set());
    out.get(m[1]).add(norm(m[2]));
  }
  return out;
}

// Importable for its normaliser (tests/skin-contract.test.mjs); only measures when run.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();

function main() {
const TO = process.argv[2] ?? npm("view", "@deepseek-ai/dsh", "dist-tags.latest");
const work = mkdtempSync(join(tmpdir(), "skin-contract-"));
try {
  const a = clientUi(FROM, work);
  const b = clientUi(TO, work);

  // 1. tokens
  const vendored = readdirSync(VENDOR).filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(VENDOR, f), "utf8")).join("\n");
  const unescape = (js) => js.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const ta = tokens(vendored);
  const tb = tokens(unescape(b.get("dsh-client-ui-theme") ?? ""));
  const removed = [...ta.keys()].filter((k) => !tb.has(k));
  const added = [...tb.keys()].filter((k) => !ta.has(k));
  const changed = [...ta.keys()].filter((k) => tb.has(k) && [...ta.get(k)].some((v) => !tb.get(k).has(v)));

  // 2. hashed classes
  const pa = prefixes(a), pb = prefixes(b);
  const kept = [...pa.keys()].filter((p) => pb.has(p));
  const dir = join(ROOT, "data", "css");
  const sheets = readdirSync(dir).filter((f) => f.endsWith(".css"));
  let targeting = 0, allKept = 0, someGone = 0, allGone = 0, newer = 0;
  const lost = new Map();
  const onlyNew = [...pb.keys()].filter((p) => !pa.has(p));
  for (const f of sheets) {
    const css = readFileSync(join(dir, f), "utf8");
    if (onlyNew.some((p) => css.includes(`.${p}`))) newer += 1;
    const hit = [...pa.keys()].filter((p) => css.includes(`.${p}`));
    if (!hit.length) continue;
    targeting += 1;
    const gone = hit.filter((p) => !pb.has(p));
    for (const g of gone) lost.set(g, (lost.get(g) ?? 0) + 1);
    if (!gone.length) allKept += 1; else if (gone.length === hit.length) allGone += 1; else someGone += 1;
  }

  console.log(JSON.stringify({
    measured: new Date().toISOString(),
    from: FROM,
    to: TO,
    tokens: { from: ta.size, to: tb.size, removed, added, changedValue: changed },
    hashedPrefixes: { from: pa.size, to: pb.size, kept: kept.length },
    frozenSheets: { total: sheets.length, targetingFromHashes: targeting, allTargetsKept: allKept, someTargetsGone: someGone, allTargetsGone: allGone, targetingNewHashes: newer },
    mostLost: [...lost].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([p, n]) => ({ prefix: p, package: pa.get(p), sheets: n })),
  }, null, 2));
} finally {
  rmSync(work, { recursive: true, force: true });
}
}
