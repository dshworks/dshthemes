import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractPalette, parseColor, scopeOf, parseBlocks, looseDecls, toHex, composite } from "../scripts/palette.mjs";
import { spring } from "../scripts/spring.mjs";

const V = new URL("../src/vendor/dsh-client-ui-theme@0.1.0-rc.6/", import.meta.url);
const BASE = ["base.css", "design-platform.css"].map((f) => readFileSync(new URL(f, V), "utf8"));

test("parseColor handles the forms themes actually use", () => {
  assert.deepEqual(parseColor("#fff"), [255, 255, 255, 1]);
  assert.deepEqual(parseColor("#00c2e980").slice(0, 3), [0, 194, 233]);
  assert.deepEqual(parseColor("rgb(4, 4, 5)"), [4, 4, 5, 1]);
  assert.deepEqual(parseColor("rgba(4 4 5 / 0.5)"), [4, 4, 5, 0.5]);
  assert.deepEqual(parseColor("hsl(0 0% 100%)"), [255, 255, 255, 1]);
  assert.equal(parseColor("var(--x)"), null);
});

test("scopeOf reads dsh's dark hook and the common conventions", () => {
  assert.equal(scopeOf("body[data-ds-dark-theme]"), "dark");
  assert.equal(scopeOf("body"), "both");
  assert.equal(scopeOf(":root", "@media (prefers-color-scheme: dark)"), "dark");
  assert.equal(scopeOf("html[data-theme='light'] body"), "light");
  assert.equal(scopeOf("body[data-dsh-black-whale]"), "both");
});

test("parseBlocks survives nested @media and skips @font-face bodies", () => {
  const css = `@font-face { font-family: X; src: url(a.woff2); } body { --a: #000; } @media (prefers-color-scheme: dark) { body { --a: #fff; } } .x { color: red; }`;
  const blocks = parseBlocks(css);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[1].media, "@media (prefers-color-scheme: dark)");
  assert.deepEqual(blocks[1].decls, [["a", "#fff"]]);
});

test("looseDecls reads object-literal and setProperty declarations", () => {
  const js = `const t = { "--dsw-alias-bg-base": "#101010", '--dsw-alias-brand-primary': '#ff00aa' }; el.style.setProperty("--dsw-alias-label-primary", "#eee");`;
  const d = Object.fromEntries(looseDecls(js));
  assert.equal(d["dsw-alias-bg-base"], "#101010");
  assert.equal(d["dsw-alias-brand-primary"], "#ff00aa");
  assert.equal(d["dsw-alias-label-primary"], "#eee");
});

test("stock shell alone changes nothing and yields no signature", () => {
  const p = extractPalette(BASE, "body { color: red; }");
  assert.equal(p.source, null);
  assert.equal(p.dark.changed, 0);
});

test("a token skin resolves var() chains against the base, per scope", () => {
  const css = `body[data-dsh-x] { --dsw-static-deepseek-500: #ff6fb6; --dsw-alias-brand-primary: var(--dsw-static-deepseek-500); }
  body[data-ds-dark-theme] { --dsw-alias-bg-base: rgb(10, 10, 12); }
  body:not([data-ds-dark-theme]) { --dsw-alias-bg-base: #fafafa; }`;
  const p = extractPalette(BASE, css);
  assert.equal(p.source, "tokens");
  assert.equal(p.dark.brand, "#ff6fb6");
  assert.equal(p.light.brand, "#ff6fb6");
  assert.equal(p.dark.bg, "#0a0a0c");
  assert.equal(p.light.bg, "#fafafa");
  assert.equal(p.tokenCount, 3);
});

test("light-dark() picks by scope and alpha composites over the scope base", () => {
  const css = `body { --dsw-alias-bg-base: light-dark(#ffffff, rgba(0, 0, 0, 0.5)); }`;
  const p = extractPalette(BASE, css);
  assert.equal(p.light.bg, "#ffffff");
  assert.equal(p.dark.bg, toHex(composite([0, 0, 0, 0.5], [10, 10, 12])));
});

test("a class-restyling skin falls back to literals and says so", () => {
  const css = `.pI_x6G_frame { background: #05070d; color: #ffffff; box-shadow: 0 0 0 rgba(0,0,0,.6); } .hHd-Xa_root { background: #0d1322; border-color: #00f0ff; } .x { color: #00f0ff; } .y { color: #00f0ff; }`;
  const p = extractPalette(BASE, css);
  assert.equal(p.source, "literals");
  assert.equal(p.leads, "dark");
  assert.equal(p.dark.bg, "#05070d");
  assert.equal(p.dark.text, "#ffffff");
  assert.equal(p.dark.brand, "#00f0ff");
});

test("font family is read from --dsw-font-family", () => {
  const p = extractPalette(BASE, `body { --dsw-font-family: 'Inter', sans-serif; --dsw-alias-bg-base: #000; }`);
  assert.equal(p.font, "Inter");
});

test("springs land at 1 and the snap overshoots", () => {
  const s = spring({ stiffness: 600, damping: 25 });
  assert.ok(s.duration > 200 && s.duration < 800, String(s.duration));
  const pts = s.easing.match(/[\d.]+/g).map(Number);
  assert.equal(pts[pts.length - 1], 1);
  assert.ok(Math.max(...pts) > 1.05, "underdamped spring should overshoot");
});
